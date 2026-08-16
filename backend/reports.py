"""AI health summary reports with adherence statistics and download support."""

import json
import logging
import os
import secrets
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security import get_current_user, resolve_target_user_id
from core.time_utils import day_bounds, now_local, today_local
from database import get_db
from models import HealthMetric, MealEntry, MedicationHistory, Medicine, ReportShare, User
from services.adherence import AdherenceCalculator
from services.ai_service import MEDICAL_DISCLAIMER, ai_service
from services.ai_config import is_configured
from services.refill import RefillPredictionEngine
from services.reminders import ReminderService

logger = logging.getLogger("pillsync-reports")

router = APIRouter(prefix="/reports", tags=["Reports"])

SUMMARY_PERIOD_DAYS = 30

SHARE_SCOPES = ("external", "patient", "caregiver", "admin")


def _build_summary_data(db: Session, user_id: int) -> dict:
    """Gather adherence, refill, health and nutrition data into a JSON dict."""
    weekly = AdherenceCalculator.weekly_report(db, user_id)
    monthly = AdherenceCalculator.monthly_report(db, user_id)
    refill = RefillPredictionEngine(db, user_id).summary()
    medicines = (
        db.query(Medicine)
        .filter(Medicine.user_id == user_id, Medicine.is_active.is_(True))
        .all()
    )

    health_cutoff = now_local().replace(tzinfo=None) - timedelta(days=30)
    metrics = (
        db.query(HealthMetric)
        .filter(HealthMetric.user_id == user_id, HealthMetric.recorded_at >= health_cutoff)
        .order_by(HealthMetric.recorded_at.asc())
        .all()
    )
    latest_health: dict[str, dict] = {}
    for record in metrics:
        latest_health[record.metric_type] = {
            "value": record.value,
            "value_text": record.value_text,
            "unit": record.unit,
            "recorded_at": record.recorded_at.isoformat() if record.recorded_at else None,
        }

    today = today_local()
    meal_start_dt, _ = day_bounds(today - timedelta(days=6))
    _, meal_end_dt = day_bounds(today)
    meals = (
        db.query(MealEntry)
        .filter(
            MealEntry.user_id == user_id,
            MealEntry.meal_date >= meal_start_dt,
            MealEntry.meal_date <= meal_end_dt,
        )
        .all()
    )
    n = max(len(meals), 1)
    nutrition = {
        "days_tracked": len(meals),
        "avg_calories": round(sum(getattr(m, "calories", 0) or 0 for m in meals) / n, 1),
        "avg_protein": round(sum(getattr(m, "protein", 0) or 0 for m in meals) / n, 1),
        "avg_carbs": round(sum(getattr(m, "carbs", 0) or 0 for m in meals) / n, 1),
        "avg_fat": round(sum(getattr(m, "fat", 0) or 0 for m in meals) / n, 1),
        "avg_water_ml": round(sum(getattr(m, "water_ml", 0) or 0 for m in meals) / n, 1),
    }

    return {
        "generated_on": today_local().isoformat(),
        "active_medicines": [
            {
                "name": m.name,
                "dosage": f"{m.dosage}{m.dosage_unit}".strip(),
                "category": m.disease_category,
                "duration": getattr(m, "duration", None) or None,
                "stock_remaining": m.stock_remaining,
            }
            for m in medicines
        ],
        "weekly": {
            "adherence": weekly["stats"]["adherence"],
            "taken": weekly["stats"]["taken"],
            "missed": weekly["stats"]["missed"],
            "skipped": weekly["stats"]["skipped"],
            "pending": weekly["stats"]["pending"],
            "streak": weekly["stats"].get("streak", 0),
            "labels": weekly["labels"],
            "daily_adherence": weekly["daily_adherence"],
            "missed_trend": weekly.get("missed_trend", []),
            "dose_windows": weekly.get("dose_windows", {}),
            "per_medicine": weekly.get("per_medicine", []),
            "expected_vs_taken": weekly.get("expected_vs_taken", {}),
        },
        "monthly": {
            "adherence": monthly["stats"]["adherence"],
            "taken": monthly["stats"]["taken"],
            "missed": monthly["stats"]["missed"],
            "skipped": monthly["stats"]["skipped"],
        },
        "refill": {
            "total_tracked": refill["total_tracked"],
            "low_stock_count": refill["low_stock_count"],
            "alerts": [a["alert_message"] for a in refill["alerts"][:5]],
        },
        "health": {
            "latest": latest_health,
            "metrics_logged": len(metrics),
        },
        "nutrition": nutrition,
    }


def _rule_based_summary(data: dict) -> str:
    """Short local fallback narrative used when AI is unavailable."""
    weekly = data["weekly"]
    adherence = weekly["adherence"]
    parts = [f"Adherence this week is {adherence}%."]
    if weekly["streak"]:
        parts.append(f"You have a {weekly['streak']}-day streak going.")
    if weekly["missed"] > 0:
        parts.append(f"{weekly['missed']} dose(s) were missed.")
    if data["refill"]["low_stock_count"]:
        parts.append(
            f"{data['refill']['low_stock_count']} medicine(s) need a refill soon."
        )

    health = data.get("health", {}).get("latest", {})
    for key, label in (
        ("blood_pressure", "blood pressure"),
        ("heart_rate", "heart rate"),
        ("sugar_level", "blood sugar"),
        ("weight", "weight"),
        ("bmi", "BMI"),
    ):
        item = health.get(key)
        if item and item.get("value_text"):
            parts.append(f"Latest {label}: {item['value_text']}.")
            break

    nutrition = data.get("nutrition", {})
    if nutrition.get("days_tracked"):
        parts.append(
            f"Nutrition average: {nutrition.get('avg_calories', 0)} kcal, "
            f"{nutrition.get('avg_water_ml', 0)} ml water per logged day."
        )

    parts.append(
        "Keep taking doses within 5 minutes of the scheduled time — after 10 minutes "
        "a dose counts as missed. Snooze instead of skip."
    )
    return " ".join(parts)


def _download_markdown(user: User, data: dict, ai_text: str) -> str:
    weekly = data["weekly"]
    monthly = data["monthly"]
    med_lines = "\n".join(
        f"- {m['name']} ({m['dosage']}) — {m['category']}"
        + (f" — {m['duration']}" if m.get("duration") else "")
        for m in data["active_medicines"]
    ) or "- None"
    alerts = "\n".join(f"- {a}" for a in data["refill"]["alerts"]) or "- None"
    return (
        f"# PillSync AI Health Summary\n\n"
        f"**User:** {user.name}\n\n"
        f"**Generated:** {data['generated_on']}\n\n"
        f"## Active medicines\n{med_lines}\n\n"
        f"## Adherence statistics\n\n"
        f"- Weekly adherence: **{weekly['adherence']}%**\n"
        f"- Taken this week: {weekly['taken']} | Missed: {weekly['missed']} | "
        f"Skipped: {weekly['skipped']} | Pending: {weekly['pending']}\n"
        f"- Current streak: **{weekly['streak']}** day(s)\n"
        f"- Monthly adherence: **{monthly['adherence']}%**\n\n"
        f"## Refill status\n{alerts}\n\n"
        f"## AI observations\n\n{ai_text}\n\n"
        f"---\n\n{MEDICAL_DISCLAIMER}\n"
    )


@router.get("/summary")
def get_health_summary(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """AI-generated health summary with adherence statistics."""
    target_id = resolve_target_user_id(db, user, patient_id)
    data = _build_summary_data(db, target_id)

    ai_text = ai_service.generate_health_summary(
        json.dumps(data, ensure_ascii=False, default=str)
    )
    engine = "ai"
    if not ai_text:
        ai_text = _rule_based_summary(data)
        engine = "rule-based"

    return {
        "summary": ai_text,
        "engine": engine,
        "ai_configured": is_configured(),
        "data": data,
        "disclaimer": MEDICAL_DISCLAIMER,
    }


@router.get("/summary/download")
def download_health_summary(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Downloadable markdown health summary report."""
    target_id = resolve_target_user_id(db, user, patient_id)
    data = _build_summary_data(db, target_id)

    ai_text = ai_service.generate_health_summary(
        json.dumps(data, ensure_ascii=False, default=str)
    )
    if not ai_text:
        ai_text = _rule_based_summary(data)

    markdown = _download_markdown(user, data, ai_text)
    filename = f"pillsync-health-summary-{data['generated_on']}.md"
    return PlainTextResponse(
        markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/today-stats")
def today_stats(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Today's adherence snapshot used by the dashboard health summary."""
    target_id = resolve_target_user_id(db, user, patient_id)
    service = ReminderService(db, target_id)
    service.refresh()

    day_start, day_end = day_bounds(today_local())
    records = (
        db.query(MedicationHistory)
        .filter(
            MedicationHistory.user_id == target_id,
            MedicationHistory.scheduled_datetime >= day_start,
            MedicationHistory.scheduled_datetime <= day_end,
        )
        .all()
    )
    stats = AdherenceCalculator.compute_stats(records)
    streak = AdherenceCalculator.compute_streak(records)
    return {"stats": stats, "streak": streak}


class ShareCreate(BaseModel):
    title: str = Field(default="", max_length=120)
    scope: str = Field(default="external", max_length=20)
    external: bool = True


def _share_link(token: str) -> str:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return f"{frontend_url}/public/report/{token}"


@router.post("/shares")
def create_share(
    data: ShareCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a shareable link for the current user's health summary report."""
    scope = data.scope if data.scope in SHARE_SCOPES else "external"
    share = ReportShare(
        user_id=user.id,
        token=secrets.token_urlsafe(24),
        title=data.title.strip(),
        scope=scope,
        external=bool(data.external),
        expires_at=None,
    )
    db.add(share)
    db.commit()
    db.refresh(share)
    return {
        "message": "Share created",
        "share": {
            "id": share.id,
            "title": share.title,
            "scope": share.scope,
            "external": share.external,
            "link": _share_link(share.token),
            "embed_url": f"{_share_link(share.token)}?embed=1",
            "token": share.token,
            "created_at": share.created_at.isoformat() if share.created_at else None,
            "revoked": share.revoked,
        },
    }


@router.get("/shares")
def list_shares(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ReportShare)
        .filter(ReportShare.user_id == user.id)
        .order_by(ReportShare.created_at.desc())
        .all()
    )
    shares = []
    for share in rows:
        shares.append(
            {
                "id": share.id,
                "title": share.title,
                "scope": share.scope,
                "external": share.external,
                "revoked": share.revoked,
                "created_at": share.created_at.isoformat() if share.created_at else None,
                "link": _share_link(share.token),
                "embed_url": f"{_share_link(share.token)}?embed=1",
            }
        )
    return {"shares": shares}


@router.delete("/shares/{share_id}")
def revoke_share(
    share_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    share = (
        db.query(ReportShare)
        .filter(ReportShare.id == share_id, ReportShare.user_id == user.id)
        .first()
    )
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    share.revoked = True
    db.commit()
    return {"message": "Share revoked"}


@router.get("/share/{token}")
def public_share(token: str, db: Session = Depends(get_db)):
    """Public, token-gated report view used for share links and embeds."""
    share = (
        db.query(ReportShare)
        .filter(ReportShare.token == token, ReportShare.revoked.is_(False))
        .first()
    )
    if not share:
        raise HTTPException(status_code=404, detail="Report not found or revoked")

    user = db.query(User).filter(User.id == share.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Report owner not found")

    data = _build_summary_data(db, user.id)
    ai_text = ai_service.generate_health_summary(json.dumps(data, ensure_ascii=False, default=str))
    if not ai_text:
        ai_text = _rule_based_summary(data)

    return {
        "share": {
            "title": share.title or f"{user.name}'s health summary",
            "scope": share.scope,
            "external": share.external,
            "owner_name": user.name,
            "generated_on": data["generated_on"],
        },
        "summary": ai_text,
        "data": data,
        "disclaimer": MEDICAL_DISCLAIMER,
    }
