"""Medicine serialization and schedule helpers."""

from datetime import time

from fastapi import HTTPException

from core.time_utils import parse_date, parse_time
from models import Medicine, MedicationSchedule
from services.refill import RefillPredictionEngine


class MedicineSerializer:
    """Converts Medicine ORM entities to API dictionaries."""

    @staticmethod
    def to_dict(med: Medicine, include_refill: bool = True) -> dict:
        payload = {
            "id": med.id,
            "user_id": med.user_id,
            "name": med.name,
            "dosage": med.dosage,
            "dosage_unit": med.dosage_unit,
            "medicine_type": med.medicine_type,
            "disease_category": med.disease_category or "General",
            "instructions": med.instructions,
            "start_date": med.start_date.isoformat() if med.start_date else None,
            "end_date": med.end_date.isoformat() if med.end_date else None,
            "is_active": med.is_active,
            "quantity_total": float(med.quantity_total or 0),
            "stock_remaining": float(med.stock_remaining or 0),
            "quantity_per_dose": float(med.quantity_per_dose or 1),
            "low_stock_threshold_days": med.low_stock_threshold_days or 5,
            "created_at": med.created_at.isoformat() if med.created_at else None,
            "schedules": [
                {
                    "id": s.id,
                    "reminder_time": s.reminder_time.strftime("%H:%M"),
                    "days_of_week": s.days_of_week,
                    "is_active": s.is_active,
                }
                for s in med.schedules
            ],
        }
        if include_refill:
            payload["refill"] = RefillPredictionEngine.predict(med)
        return payload

    @staticmethod
    def parse_schedule_time(time_str: str) -> time:
        try:
            return parse_time(time_str)
        except (IndexError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid time format: {time_str}") from exc

    @staticmethod
    def build_schedule(medicine_id: int, reminder_time: str, days_of_week: str | None) -> MedicationSchedule:
        return MedicationSchedule(
            medicine_id=medicine_id,
            reminder_time=MedicineSerializer.parse_schedule_time(reminder_time),
            days_of_week=days_of_week,
        )

    @staticmethod
    def parse_optional_date(date_str: str | None):
        return parse_date(date_str)
