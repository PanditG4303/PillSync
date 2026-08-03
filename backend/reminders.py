from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.constants import TAKEN_STATUSES
from core.security import get_current_user, resolve_target_user_id
from core.time_utils import day_bounds, now_local, today_local, week_start
from database import get_db
from models import MedicationHistory, User
from services.refill import RefillPredictionEngine
from services.reminders import ReminderService

router = APIRouter(prefix="/reminders", tags=["Reminders"])


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
    now = now_local().replace(tzinfo=None)
    record.status = ReminderService.resolve_taken_status(record.scheduled_datetime, now)
    record.taken_datetime = now

    # Decrement stock only when transitioning into a taken state
    if previous not in TAKEN_STATUSES and record.medicine:
        RefillPredictionEngine(db, record.user_id).consume_dose(record.medicine)

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
    db.commit()
    db.refresh(record)
    return ReminderService.to_dict(record)


@router.get("/history")
def get_history(
    filter_param: Optional[str] = Query("all", alias="filter"),
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

    records = query.order_by(MedicationHistory.scheduled_datetime.desc()).all()
    return [ReminderService.to_dict(r) for r in records]

