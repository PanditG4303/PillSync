"""Aggregated dashboard summary — one call powers the PillSync v2 dashboard."""

import json
import logging
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.security import get_current_user, resolve_target_user_id
from core.time_utils import day_bounds, now_local, today_local
from database import get_db
from models import HealthMetric, MealEntry, MedicationHistory, Medicine, User
from services.adherence import AdherenceCalculator
from services.ai_config import TASK_ASSISTANT, is_configured
from services.ai_service import ai_service
from services.reminders import ReminderService

logger = logging.getLogger("pillsync-dashboard")

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _latest_metric(db: Session, user_id: int, metric_type: str):
    return (
        db.query(HealthMetric)
        .filter(HealthMetric.user_id == user_id, HealthMetric.metric_type == metric_type)
        .order_by(HealthMetric.recorded_at.desc())
        .first()
    )


def _compute_health_score(adherence: int, streak: int, metrics: dict, nutrition: dict) -> dict:
    """Composite AI health score (0-100) from adherence, lifestyle and nutrition."""
    score = int(adherence or 0)
    score += min(streak * 2, 10)
    if metrics.get("sleep"):
        score += min(int(metrics["sleep"]), 8) if metrics["sleep"] >= 7 else max(int(metrics["sleep"] - 4), 0)
    if metrics.get("steps"):
        score += min(int(metrics["steps"] / 1000), 5)
    if metrics.get("water"):
        score += min(int(metrics["water"] / 500), 5)
    if nutrition and nutrition.get("progress", {}).get("calories"):
        cal = nutrition["progress"]["calories"]
        score += 5 if 70 <= cal <= 110 else (2 if 50 <= cal <= 130 else 0)
    score = max(0, min(100, score))

    if score >= 85:
        label = "Excellent"
        message = "Your routine is on point. Keep the momentum going!"
    elif score >= 70:
        label = "Good"
        message = "Solid habits. A little more consistency will push you higher."
    elif score >= 50:
        label = "Fair"
        message = "There is room to grow. Small daily steps will compound fast."
    else:
        label = "Needs Attention"
        message = "Let's rebuild your routine one habit at a time."
    return {"score": score, "label": label, "message": message}


@router.get("/summary")
def dashboard_summary(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)

    # --- Reminders ---------------------------------------------------------
    service = ReminderService(db, target_id)
    service.refresh()

    today = today_local()
    day_start, day_end = day_bounds(today)
    today_records = (
        db.query(MedicationHistory)
        .filter(
            MedicationHistory.user_id == target_id,
            MedicationHistory.scheduled_datetime >= day_start,
            MedicationHistory.scheduled_datetime <= day_end,
        )
        .order_by(MedicationHistory.scheduled_datetime.asc())
        .all()
    )
    today_reminders = [ReminderService.to_dict(r) for r in today_records]
    today_stats = AdherenceCalculator.compute_stats(today_records)

    # --- Weekly chart ------------------------------------------------------
    weekly = AdherenceCalculator.weekly_report(db, target_id)
    weekly_stats = weekly["stats"]

    # --- Upcoming / missed -------------------------------------------------
    now = now_local().replace(tzinfo=None)
    upcoming = [
        r for r in today_records
        if r.status == "pending" and r.scheduled_datetime > now and not (r.snoozed_until and r.snoozed_until > now)
    ]
    upcoming.sort(key=lambda r: r.scheduled_datetime)
    missed_today = [r for r in today_records if r.status == "missed"]
    due_now = [r for r in today_records if r.status == "pending" and r.scheduled_datetime <= now]

    # --- Timeline (recent actions + upcoming) ------------------------------
    timeline = []
    for r in today_records[:8]:
        timeline.append(
            {
                "time": r.scheduled_datetime.isoformat(),
                "medicine_name": r.medicine.name if r.medicine else "Medicine",
                "status": r.status,
                "id": r.id,
            }
        )
    timeline.sort(key=lambda item: item["time"], reverse=True)

    # --- Health metrics -----------------------------------------------------
    def _metric_value(metric_type: str) -> Optional[float]:
        row = _latest_metric(db, target_id, metric_type)
        return row.value if row else None

    metrics = {
        "weight": _metric_value("weight"),
        "height": _metric_value("height"),
        "blood_pressure": _metric_value("blood_pressure"),
        "sugar_level": _metric_value("sugar_level"),
        "heart_rate": _metric_value("heart_rate"),
        "blood_oxygen": _metric_value("blood_oxygen"),
        "temperature": _metric_value("temperature"),
        "sleep": _metric_value("sleep_hours"),
        "water": _metric_value("water_intake"),
        "steps": _metric_value("daily_steps"),
        "mood": _metric_value("mood"),
    }

    # --- Today's nutrition --------------------------------------------------
    meal_entries = (
        db.query(MealEntry)
        .filter(
            MealEntry.user_id == target_id,
            MealEntry.meal_date >= day_start,
            MealEntry.meal_date <= day_end,
        )
        .all()
    )
    nutrition = {
        "calories": round(sum(e.calories for e in meal_entries), 1),
        "protein": round(sum(e.protein for e in meal_entries), 1),
        "carbs": round(sum(e.carbs for e in meal_entries), 1),
        "fat": round(sum(e.fat for e in meal_entries), 1),
        "water_ml": round(sum(e.water_ml for e in meal_entries), 1),
        "meals": len(meal_entries),
        "progress": {
            "calories": round(sum(e.calories for e in meal_entries) / 2000 * 100),
            "water_ml": round(sum((e.water_ml or 0) for e in meal_entries) / 2500 * 100),
            "protein": round(sum(e.protein for e in meal_entries) / 60 * 100),
        },
        "targets": {"calories": 2000, "water_ml": 2500, "protein": 60},
    }

    # --- Health score + AI recommendation ------------------------------------
    health_score = _compute_health_score(
        weekly_stats.get("adherence", 0),
        weekly_stats.get("streak", 0),
        metrics,
        nutrition,
    )

    ai_rec = None
    ai_engine = "rule-based"
    try:
        ai_rec = ai_service.lifestyle_advice(
            "You are the PillSync daily health coach. Based ONLY on the JSON below, "
            "write one friendly 2-3 sentence daily recommendation in plain text "
            "(no markdown headers). Do not diagnose.\n"
            f"Data:\n{json.dumps({'adherence': weekly_stats.get('adherence', 0), 'streak': weekly_stats.get('streak', 0), 'missed_today': len(missed_today), 'sleep_hours': metrics.get('sleep'), 'water_ml': nutrition['water_ml'], 'steps': metrics.get('steps'), 'mood': metrics.get('mood')}, ensure_ascii=False)}"
        )
    except Exception as exc:  # never break the dashboard
        logger.info("Dashboard AI recommendation unavailable: %s", exc.__class__.__name__)

    if ai_rec:
        ai_engine = "ai"
    else:
        if weekly_stats.get("adherence", 0) >= 85:
            ai_rec = "You're on a great streak. Keep your schedule steady and log today's doses early to stay ahead."
        elif missed_today:
            ai_rec = "A couple of doses slipped today. Use the snooze button next time instead of skipping — small wins build the habit."
        elif metrics.get("sleep") and metrics["sleep"] < 7:
            ai_rec = "Sleep looks a little short. Try winding down 30 minutes earlier tonight to support your medication routine."
        elif nutrition["water_ml"] < 1500:
            ai_rec = "Hydration is running low today. Keep a water bottle nearby and sip between meals."
        else:
            ai_rec = "Everything looks balanced today. Take your next dose on time and consider logging a mood entry."

    # --- Mood ----------------------------------------------------------------
    mood_row = _latest_metric(db, target_id, "mood")

    return {
        "date": today.isoformat(),
        "greeting_name": user.name,
        "today": {
            "reminders": today_reminders,
            "stats": today_stats,
            "missed": len(missed_today),
            "due_now": len(due_now),
        },
        "upcoming_reminder": (
            ReminderService.to_dict(upcoming[0]) if upcoming else None
        ),
        "next_due_now": (
            ReminderService.to_dict(due_now[0]) if due_now else None
        ),
        "weekly": {
            "adherence": weekly_stats.get("adherence", 0),
            "streak": weekly_stats.get("streak", 0),
            "taken": weekly_stats.get("taken", 0),
            "missed": weekly_stats.get("missed", 0),
            "skipped": weekly_stats.get("skipped", 0),
            "pending": weekly_stats.get("pending", 0),
            "labels": weekly["labels"],
            "daily_adherence": weekly["daily_adherence"],
            "per_medicine": weekly.get("per_medicine", []),
        },
        "health": {
            "metrics": metrics,
            "score": health_score,
            "ai_recommendation": ai_rec,
            "ai_engine": ai_engine,
            "ai_configured": is_configured(),
            "mood": (
                {"value": mood_row.value, "recorded_at": mood_row.recorded_at.isoformat()}
                if mood_row
                else None
            ),
        },
        "nutrition": nutrition,
        "timeline": timeline,
        "medicine_count": db.query(Medicine).filter(Medicine.user_id == target_id, Medicine.is_active.is_(True)).count(),
    }