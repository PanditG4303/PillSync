from datetime import datetime, timedelta, date, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Medicine, MedicationSchedule, MedicationHistory, User
from auth import get_current_user

router = APIRouter(prefix="/reminders", tags=["Reminders"])

GRACE_PERIOD_MINUTES = 30


def ensure_today_records(db: Session, user_id: int):
    today = date.today()
    current_weekday = today.weekday()

    active_medicines = (
        db.query(Medicine)
        .filter(Medicine.user_id == user_id, Medicine.is_active == True)
        .all()
    )

    for med in active_medicines:
        if med.start_date and med.start_date > today:
            continue
        if med.end_date and med.end_date < today:
            continue

        for schedule in med.schedules:
            if not schedule.is_active:
                continue
            if schedule.days_of_week:
                days = [int(d.strip()) for d in schedule.days_of_week.split(",")]
                if current_weekday not in days:
                    continue

            scheduled_datetime = datetime.combine(today, schedule.reminder_time)

            existing = (
                db.query(MedicationHistory)
                .filter(
                    MedicationHistory.user_id == user_id,
                    MedicationHistory.schedule_id == schedule.id,
                    MedicationHistory.scheduled_datetime == scheduled_datetime,
                )
                .first()
            )
            if existing:
                continue

            history = MedicationHistory(
                user_id=user_id,
                medicine_id=med.id,
                schedule_id=schedule.id,
                scheduled_datetime=scheduled_datetime,
                status="pending",
            )
            db.add(history)

    db.commit()


def apply_grace_period(db: Session, user_id: int):
    now = datetime.now()
    cutoff = now - timedelta(minutes=GRACE_PERIOD_MINUTES)
    pending = (
        db.query(MedicationHistory)
        .filter(
            MedicationHistory.user_id == user_id,
            MedicationHistory.status == "pending",
            MedicationHistory.scheduled_datetime < cutoff,
        )
        .all()
    )
    for record in pending:
        record.status = "missed"
    if pending:
        db.commit()


def history_to_dict(h):
    return {
        "id": h.id,
        "user_id": h.user_id,
        "medicine_id": h.medicine_id,
        "schedule_id": h.schedule_id,
        "scheduled_datetime": h.scheduled_datetime.isoformat(),
        "taken_datetime": h.taken_datetime.isoformat() if h.taken_datetime else None,
        "status": h.status,
        "created_at": h.created_at.isoformat() if h.created_at else None,
        "medicine_name": h.medicine.name if h.medicine else None,
        "dosage": h.medicine.dosage if h.medicine else None,
        "dosage_unit": h.medicine.dosage_unit if h.medicine else None,
    }


def compute_stats(records):
    total = len(records)
    taken = sum(1 for r in records if r.status in ("taken", "late"))
    pending = sum(1 for r in records if r.status == "pending")
    missed = sum(1 for r in records if r.status == "missed")
    skipped = sum(1 for r in records if r.status == "skipped")
    late = sum(1 for r in records if r.status == "late")
    completed = taken + missed + skipped
    adherence = round(taken / completed * 100) if completed > 0 else (100 if total == 0 else 0)
    return {
        "total": total,
        "taken": taken,
        "pending": pending,
        "missed": missed,
        "skipped": skipped,
        "late": late,
        "adherence": adherence,
    }


@router.get("/today")
def get_todays_reminders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_today_records(db, user.id)
    apply_grace_period(db, user.id)

    today = date.today()
    today_start = datetime.combine(today, time.min)
    today_end = datetime.combine(today, time.max)

    records = (
        db.query(MedicationHistory)
        .filter(
            MedicationHistory.user_id == user.id,
            MedicationHistory.scheduled_datetime >= today_start,
            MedicationHistory.scheduled_datetime <= today_end,
        )
        .order_by(MedicationHistory.scheduled_datetime.asc())
        .all()
    )

    return {
        "reminders": [history_to_dict(r) for r in records],
        "stats": compute_stats(records),
    }


@router.post("/{history_id}/taken")
def mark_taken(history_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = (
        db.query(MedicationHistory)
        .filter(MedicationHistory.id == history_id, MedicationHistory.user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    now = datetime.now()
    scheduled = record.scheduled_datetime
    grace_end = scheduled + timedelta(minutes=GRACE_PERIOD_MINUTES)

    record.status = "taken" if now <= grace_end else "late"
    record.taken_datetime = now
    db.commit()
    return history_to_dict(record)


@router.post("/{history_id}/skipped")
def mark_skipped(history_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = (
        db.query(MedicationHistory)
        .filter(MedicationHistory.id == history_id, MedicationHistory.user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    record.status = "skipped"
    record.taken_datetime = datetime.now()
    db.commit()
    return history_to_dict(record)


@router.get("/history")
def get_history(
    filter_param: Optional[str] = Query("all", alias="filter"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_today_records(db, user.id)
    apply_grace_period(db, user.id)

    query = db.query(MedicationHistory).filter(MedicationHistory.user_id == user.id)

    today = date.today()
    if filter_param == "today":
        day_start = datetime.combine(today, time.min)
        day_end = datetime.combine(today, time.max)
        query = query.filter(
            MedicationHistory.scheduled_datetime >= day_start,
            MedicationHistory.scheduled_datetime <= day_end,
        )
    elif filter_param == "week":
        week_start = datetime.combine(today - timedelta(days=today.weekday()), time.min)
        query = query.filter(MedicationHistory.scheduled_datetime >= week_start)

    records = query.order_by(MedicationHistory.scheduled_datetime.desc()).all()
    return [history_to_dict(r) for r in records]
