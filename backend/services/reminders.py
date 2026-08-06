"""Reminder lifecycle management."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from core.constants import GRACE_PERIOD_MINUTES, STATUS_MISSED, STATUS_PENDING
from core.time_utils import combine_local, now_local, today_local
from models import MedicationHistory, MedicationSchedule, Medicine
from services.adherence import AdherenceCalculator


class ReminderService:
    """Owns creation, grace-period expiry, and serialization of dose records."""

    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id

    def ensure_today_records(self) -> None:
        today = today_local()
        current_weekday = today.weekday()

        active_medicines = (
            self.db.query(Medicine)
            .filter(Medicine.user_id == self.user_id, Medicine.is_active.is_(True))
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
                    try:
                        days = [int(d.strip()) for d in schedule.days_of_week.split(",") if d.strip()]
                    except ValueError:
                        continue
                    if current_weekday not in days:
                        continue

                scheduled_datetime = combine_local(today, schedule.reminder_time)
                exists = (
                    self.db.query(MedicationHistory.id)
                    .filter(
                        MedicationHistory.user_id == self.user_id,
                        MedicationHistory.schedule_id == schedule.id,
                        MedicationHistory.scheduled_datetime == scheduled_datetime,
                    )
                    .first()
                )
                if exists:
                    continue

                self.db.add(
                    MedicationHistory(
                        user_id=self.user_id,
                        medicine_id=med.id,
                        schedule_id=schedule.id,
                        scheduled_datetime=scheduled_datetime,
                        status=STATUS_PENDING,
                    )
                )

        self.db.commit()

    def apply_grace_period(self) -> int:
        cutoff = now_local().replace(tzinfo=None) - timedelta(minutes=GRACE_PERIOD_MINUTES)
        pending = (
            self.db.query(MedicationHistory)
            .filter(
                MedicationHistory.user_id == self.user_id,
                MedicationHistory.status == STATUS_PENDING,
                MedicationHistory.scheduled_datetime < cutoff,
            )
            .all()
        )
        for record in pending:
            record.status = STATUS_MISSED
        if pending:
            self.db.commit()
        return len(pending)

    def refresh(self) -> None:
        self.ensure_today_records()
        self.apply_grace_period()

    @staticmethod
    def to_dict(record: MedicationHistory) -> dict:
        return {
            "id": record.id,
            "user_id": record.user_id,
            "medicine_id": record.medicine_id,
            "schedule_id": record.schedule_id,
            "scheduled_datetime": record.scheduled_datetime.isoformat(),
            "taken_datetime": record.taken_datetime.isoformat() if record.taken_datetime else None,
            "status": record.status,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "medicine_name": record.medicine.name if record.medicine else None,
            "dosage": record.medicine.dosage if record.medicine else None,
            "dosage_unit": record.medicine.dosage_unit if record.medicine else None,
        }

    @staticmethod
    def resolve_taken_status(scheduled: datetime, taken_at: datetime | None = None) -> str:
        taken_at = taken_at or now_local().replace(tzinfo=None)
        if getattr(taken_at, "tzinfo", None) is not None:
            taken_at = taken_at.replace(tzinfo=None)
        grace_end = scheduled + timedelta(minutes=GRACE_PERIOD_MINUTES)
        return "taken" if taken_at <= grace_end else "late"

    @staticmethod
    def compute_stats(records) -> dict:
        return AdherenceCalculator.compute_stats(records)

    @staticmethod
    def schedule_applies_today(schedule: MedicationSchedule, weekday: int) -> bool:
        if not schedule.is_active:
            return False
        if not schedule.days_of_week:
            return True
        try:
            days = [int(d.strip()) for d in schedule.days_of_week.split(",") if d.strip()]
        except ValueError:
            return False
        return weekday in days
