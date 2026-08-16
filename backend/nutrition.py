"""Food & Nutrition — meal logging, daily summary, weekly trends and AI guidance.

Meals are stored per user with meal_type in (breakfast, lunch, dinner, snacks)
plus optional water logged together with meals. The dashboard consumes
/nutrition/today and /nutrition/summary for the nutrition summary widgets.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security import get_current_user, resolve_target_user_id
from core.time_utils import day_bounds, now_local, today_local
from database import get_db
from models import MealEntry, User
from services.ai_config import TASK_ASSISTANT, is_configured
from services.ai_service import ai_service

logger = logging.getLogger("pillsync-nutrition")

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])

VALID_MEAL_TYPES = ("breakfast", "lunch", "dinner", "snacks")

MEAL_LABELS = {
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
    "snacks": "Snacks",
}

MEAL_ICONS = {
    "breakfast": "coffee",
    "lunch": "sandwich",
    "dinner": "dinner",
    "snacks": "apple",
}

DAILY_CALORIE_TARGET = 2000
DAILY_WATER_TARGET = 2500
DAILY_PROTEIN_TARGET = 60
DAILY_CARBS_TARGET = 250
DAILY_FAT_TARGET = 65


class MealIn(BaseModel):
    meal_type: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    water_ml: float = 0
    notes: str = ""
    meal_date: Optional[str] = None


def _meal_dict(entry: MealEntry) -> dict:
    return {
        "id": entry.id,
        "meal_type": entry.meal_type,
        "label": MEAL_LABELS.get(entry.meal_type, entry.meal_type.title()),
        "name": entry.name,
        "calories": entry.calories,
        "protein": entry.protein,
        "carbs": entry.carbs,
        "fat": entry.fat,
        "water_ml": entry.water_ml,
        "notes": entry.notes or "",
        "meal_date": entry.meal_date.isoformat() if entry.meal_date else None,
    }


def _agg_day(entries: list) -> dict:
    return {
        "calories": round(sum(e.calories for e in entries), 1),
        "protein": round(sum(e.protein for e in entries), 1),
        "carbs": round(sum(e.carbs for e in entries), 1),
        "fat": round(sum(e.fat for e in entries), 1),
        "water_ml": round(sum(e.water_ml for e in entries), 1),
        "meals": len(entries),
    }


@router.post("/meals", status_code=201)
def create_meal(
    data: MealIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meal_type = (data.meal_type or "").strip().lower()
    if meal_type not in VALID_MEAL_TYPES:
        raise HTTPException(status_code=400, detail="meal_type must be one of breakfast, lunch, dinner, snacks")

    meal_date = None
    if data.meal_date:
        try:
            meal_date = datetime.fromisoformat(data.meal_date)
        except ValueError:
            meal_date = None
    entry = MealEntry(
        user_id=user.id,
        meal_type=meal_type,
        name=data.name.strip(),
        calories=max(float(data.calories or 0), 0),
        protein=max(float(data.protein or 0), 0),
        carbs=max(float(data.carbs or 0), 0),
        fat=max(float(data.fat or 0), 0),
        water_ml=max(float(data.water_ml or 0), 0),
        notes=data.notes,
        meal_date=meal_date or now_local().replace(tzinfo=None),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _meal_dict(entry)


@router.get("/meals")
def list_meals(
    days: int = Query(7, ge=1, le=90),
    meal_type: Optional[str] = Query(None),
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    query = db.query(MealEntry).filter(MealEntry.user_id == target_id)
    if meal_type:
        query = query.filter(MealEntry.meal_type == meal_type)
    cutoff = now_local().replace(tzinfo=None) - timedelta(days=days)
    query = query.filter(MealEntry.meal_date >= cutoff)
    entries = query.order_by(MealEntry.meal_date.desc()).all()
    return {"meals": [_meal_dict(e) for e in entries], "count": len(entries)}


@router.delete("/meals/{meal_id}")
def delete_meal(
    meal_id: int,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    entry = (
        db.query(MealEntry)
        .filter(MealEntry.id == meal_id, MealEntry.user_id == target_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Meal not found")
    db.delete(entry)
    db.commit()
    return {"message": "Meal deleted"}


@router.get("/today")
def today_nutrition(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    day_start, day_end = day_bounds(today_local())
    entries = (
        db.query(MealEntry)
        .filter(
            MealEntry.user_id == target_id,
            MealEntry.meal_date >= day_start,
            MealEntry.meal_date <= day_end,
        )
        .order_by(MealEntry.meal_date.asc())
        .all()
    )
    by_type = {key: [] for key in VALID_MEAL_TYPES}
    for entry in entries:
        by_type.setdefault(entry.meal_type, []).append(_meal_dict(entry))

    totals = _agg_day(entries)
    return {
        "totals": totals,
        "by_type": by_type,
        "targets": {
            "calories": DAILY_CALORIE_TARGET,
            "water_ml": DAILY_WATER_TARGET,
            "protein": DAILY_PROTEIN_TARGET,
            "carbs": DAILY_CARBS_TARGET,
            "fat": DAILY_FAT_TARGET,
        },
        "progress": {
            "calories": round(totals["calories"] / DAILY_CALORIE_TARGET * 100),
            "water_ml": round(totals["water_ml"] / DAILY_WATER_TARGET * 100),
            "protein": round(totals["protein"] / DAILY_PROTEIN_TARGET * 100),
            "carbs": round(totals["carbs"] / DAILY_CARBS_TARGET * 100),
            "fat": round(totals["fat"] / DAILY_FAT_TARGET * 100),
        },
        "date": today_local().isoformat(),
    }


@router.get("/summary")
def nutrition_summary(
    days: int = Query(7, ge=2, le=30),
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    today = today_local()
    start = today - timedelta(days=days - 1)
    start_dt, _ = day_bounds(start)
    _, today_end = day_bounds(today)
    entries = (
        db.query(MealEntry)
        .filter(
            MealEntry.user_id == target_id,
            MealEntry.meal_date >= start_dt,
            MealEntry.meal_date <= today_end,
        )
        .order_by(MealEntry.meal_date.asc())
        .all()
    )

    daily: dict[str, list] = {}
    for entry in entries:
        key = entry.meal_date.date().isoformat()
        daily.setdefault(key, []).append(entry)

    labels = []
    calories_series = []
    protein_series = []
    water_series = []
    for i in range(days):
        day = (start + timedelta(days=i)).isoformat()
        labels.append((start + timedelta(days=i)).strftime("%d %b"))
        if day in daily:
            agg = _agg_day(daily[day])
            calories_series.append(agg["calories"])
            protein_series.append(agg["protein"])
            water_series.append(agg["water_ml"])
        else:
            calories_series.append(0)
            protein_series.append(0)
            water_series.append(0)

    per_meal_type = {key: _agg_day([e for e in entries if e.meal_type == key]) for key in VALID_MEAL_TYPES}
    totals = _agg_day(entries)
    avg = {
        "calories": round(totals["calories"] / days, 1),
        "protein": round(totals["protein"] / days, 1),
        "carbs": round(totals["carbs"] / days, 1),
        "fat": round(totals["fat"] / days, 1),
        "water_ml": round(totals["water_ml"] / days, 1),
    }

    return {
        "days": days,
        "labels": labels,
        "calories_series": calories_series,
        "protein_series": protein_series,
        "water_series": water_series,
        "per_meal_type": per_meal_type,
        "totals": totals,
        "daily_average": avg,
        "targets": {
            "calories": DAILY_CALORIE_TARGET,
            "water_ml": DAILY_WATER_TARGET,
            "protein": DAILY_PROTEIN_TARGET,
            "carbs": DAILY_CARBS_TARGET,
            "fat": DAILY_FAT_TARGET,
        },
    }


HEALTHY_TIPS = [
    "Start meals with vegetables or a salad — fiber helps with fullness and blood sugar.",
    "Prefer whole grains over refined carbs for steadier energy.",
    "Aim for protein in every meal to support muscles and satiety.",
    "Drink a glass of water before each meal to support hydration.",
    "Keep portion sizes consistent — your medication timing stays more predictable.",
    "Limit late-night heavy meals; a light snack is gentler on digestion.",
    "Pair iron-rich foods with vitamin C (citrus, bell peppers) for better absorption.",
    "Choose baked, grilled or steamed over fried when you can.",
]


@router.get("/recommendation")
def meal_recommendation(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    today = today_nutrition(patient_id=patient_id, user=user, db=db)
    week = nutrition_summary(days=7, patient_id=patient_id, user=user, db=db)

    ai_text = None
    engine = "rule-based"
    try:
        ai_text = ai_service.lifestyle_advice(
            "You are the PillSync nutrition coach. Based ONLY on the user's nutrition "
            "data below, suggest one balanced meal plan for the rest of today plus one "
            "practical tip. Use markdown with bullet lists, keep it under 180 words, and "
            "never give medical advice — note that users on medication should confirm "
            "diet changes with their clinician.\n"
            f"Data:\n{json.dumps({'today': today, 'weekly_average': week['daily_average'], 'targets': week['targets']}, ensure_ascii=False, default=str)}"
        )
    except Exception as exc:  # never break the nutrition page
        logger.info("AI meal recommendation unavailable: %s", exc.__class__.__name__)

    if ai_text:
        engine = "ai"
    else:
        avg = week["daily_average"]
        remaining = max(week["targets"]["calories"] - today["totals"]["calories"], 0)
        ai_text = (
            f"## Suggested plan for the rest of today\n\n"
            f"- You have about **{remaining} kcal** left in your daily target.\n"
            f"- Finish the day with a balanced dinner: lean protein, vegetables, and "
            f"a whole-grain serving.\n"
            f"- If snacking, choose fruit, nuts, or yogurt instead of processed snacks.\n"
            f"- Your 7-day average is **{avg['calories']} kcal/day** with **{avg['protein']} g protein** "
            f"and **{avg['water_ml']} ml water** — keep that momentum.\n\n"
            f"## Quick tip\n\n- {HEALTHY_TIPS[0]}"
        )

    return {
        "recommendation": ai_text,
        "engine": engine,
        "ai_configured": is_configured(),
        "tips": HEALTHY_TIPS,
        "today": today,
        "week": week,
    }