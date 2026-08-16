from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.constants import TAKEN_STATUSES
from core.security import get_current_user, resolve_target_user_id
from core.time_utils import day_bounds, now_local, today_local, week_start
from database import get_db
from models import MedicationHistory, Medicine, User
from services.notifications import create_notification
from services.refill import RefillPredictionEngine
from services.reminders import ReminderService

router = APIRouter(prefix="/reminders", tags=["Reminders"])

VALID_SNOOZE_MINUTES = (5, 10, 15)


class SnoozeRequest(BaseModel):
    minutes: int = Field(10, ge=1, le=60)


def _service(db: Session, target_user_id: int) -> ReminderService:
    return ReminderService(db, target_user_id)


def _get_history_record(db: Session, history_id: int, user: User, patient_id: Optional[int] = None) -> MedicationHistory:
    target_id = resolve_target_user_id(db, user, patient_id)
    record = (
        db.query(MedicationHistory)
        .filter(MedicationHistory.id == history_id, MedicationHistory.user_id == target_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.get("/today")
def get_todays_reminders(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    service = _service(db, target_id)
    service.refresh()

    today = today_local()
    day_start, day_end = day_bounds(today)
    records = (
        db.query(MedicationHistory)
        .filter(
            MedicationHistory.user_id == target_id,
            MedicationHistory.scheduled_datetime >= day_start,
            MedicationHistory.scheduled_datetime <= day_end,
        )
        .order_by(MedicationHistory.scheduled_datetime.asc())
        .all()
    )

    return {
        "reminders": [ReminderService.to_dict(r) for r in records],
        "stats": ReminderService.compute_stats(records),
    }


@router.post("/{history_id}/taken")
def mark_taken(
    history_id: int,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = _get_history_record(db, history_id, user, patient_id)
    previous = record.status
    if previous in ("missed", "skipped"):
        raise HTTPException(status_code=400, detail=f"Dose already marked as {previous}")
    now = now_local().replace(tzinfo=None)
    base = record.scheduled_datetime
    if record.snoozed_until and record.snoozed_until > base:
        base = record.snoozed_until
    record.status = ReminderService.resolve_taken_status(base, now)
    record.taken_datetime = now

    # Decrement stock only when transitioning into a taken state
    if previous not in TAKEN_STATUSES and record.medicine:
        RefillPredictionEngine(db, record.user_id).consume_dose(record.medicine)

    create_notification(
        db,
        record.user_id,
        type="action",
        title="Dose Taken",
        body=f"{record.medicine.name if record.medicine else 'Medicine'} marked as taken",
        medicine_id=record.medicine_id,
        history_id=record.id,
    )

    db.commit()
    db.refresh(record)
    return ReminderService.to_dict(record)


@router.post("/{history_id}/skipped")
def mark_skipped(
    history_id: int,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = _get_history_record(db, history_id, user, patient_id)
    record.status = "skipped"
    record.taken_datetime = now_local().replace(tzinfo=None)

    create_notification(
        db,
        record.user_id,
        type="action",
        title="Dose Skipped",
        body=f"{record.medicine.name if record.medicine else 'Medicine'} skipped",
        medicine_id=record.medicine_id,
        history_id=record.id,
    )

    db.commit()
    db.refresh(record)
    return ReminderService.to_dict(record)


@router.post("/{history_id}/snoozed")
def snooze_reminder(
    history_id: int,
    data: SnoozeRequest,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = _get_history_record(db, history_id, user, patient_id)
    if record.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending reminders can be snoozed")
    minutes = data.minutes
    if minutes not in VALID_SNOOZE_MINUTES:
        minutes = 10
    record.snoozed_until = now_local().replace(tzinfo=None) + timedelta(minutes=minutes)
    record.last_notified_at = None
    db.commit()
    db.refresh(record)
    return ReminderService.to_dict(record)


@router.get("/history")
def get_history(
    filter_param: Optional[str] = Query("all", alias="filter"),
    q: Optional[str] = Query(None, max_length=100),
    sort: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    service = _service(db, target_id)
    service.refresh()

    query = db.query(MedicationHistory).filter(MedicationHistory.user_id == target_id)
    today = today_local()

    if filter_param == "today":
        day_start, day_end = day_bounds(today)
        query = query.filter(
            MedicationHistory.scheduled_datetime >= day_start,
            MedicationHistory.scheduled_datetime <= day_end,
        )
    elif filter_param == "week":
        week_start_dt, _ = day_bounds(week_start(today))
        query = query.filter(MedicationHistory.scheduled_datetime >= week_start_dt)
    elif filter_param == "month":
        month_start_dt, _ = day_bounds(today.replace(day=1))
        query = query.filter(MedicationHistory.scheduled_datetime >= month_start_dt)

    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.join(Medicine).filter(Medicine.name.ilike(like))

    order = (
        MedicationHistory.scheduled_datetime.asc()
        if sort == "asc"
        else MedicationHistory.scheduled_datetime.desc()
    )
    records = query.order_by(order).all()
    return [ReminderService.to_dict(r) for r in records]

