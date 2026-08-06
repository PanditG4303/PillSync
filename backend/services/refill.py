"""AI refill prediction engine."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from core.constants import DEFAULT_REFILL_ALERT_DAYS, TAKEN_STATUSES
from core.time_utils import today_local
from models import Medicine, MedicationHistory


class RefillPredictionEngine:
    """
    Continuously estimates stock depletion from schedules + consumption.

    remaining_stock / average_daily_consumption = days_remaining
    """

    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id

    @staticmethod
    def doses_per_day(medicine: Medicine) -> float:
        active = [s for s in medicine.schedules if s.is_active]
        if not active:
            return 0.0

        total = 0.0
        for schedule in active:
            if not schedule.days_of_week:
                total += 1.0
                continue
            try:
                days = [int(d.strip()) for d in schedule.days_of_week.split(",") if d.strip()]
            except ValueError:
                total += 1.0
                continue
            # Average doses/day across a week
            total += len(days) / 7.0
        return total

    @classmethod
    def average_daily_consumption(cls, medicine: Medicine) -> float:
        per_dose = medicine.quantity_per_dose or 1.0
        return per_dose * cls.doses_per_day(medicine)

    @classmethod
    def predict(cls, medicine: Medicine, as_of: date | None = None) -> dict[str, Any]:
        as_of = as_of or today_local()
        stock = float(medicine.stock_remaining or 0)
        daily = cls.average_daily_consumption(medicine)
        threshold = medicine.low_stock_threshold_days or DEFAULT_REFILL_ALERT_DAYS

        if daily <= 0:
            days_remaining = None if stock <= 0 else 999
            depletion = None
            refill_date = None
            status = "no_schedule" if stock > 0 else "empty"
        else:
            days_remaining = stock / daily
            whole_days = int(days_remaining)
            depletion = as_of + timedelta(days=max(whole_days, 0))
            # Recommend refill a few days before depletion
            lead = min(threshold, max(whole_days - 1, 0))
            refill_date = depletion - timedelta(days=lead) if depletion else None
            if stock <= 0:
                status = "empty"
            elif days_remaining <= threshold:
                status = "low"
            elif days_remaining <= threshold * 2:
                status = "watch"
            else:
                status = "ok"

        return {
            "medicine_id": medicine.id,
            "name": medicine.name,
            "disease_category": medicine.disease_category or "General",
            "stock_remaining": round(stock, 2),
            "quantity_total": round(float(medicine.quantity_total or 0), 2),
            "quantity_per_dose": float(medicine.quantity_per_dose or 1),
            "doses_per_day": round(cls.doses_per_day(medicine), 2),
            "average_daily_consumption": round(daily, 2),
            "days_remaining": round(days_remaining, 1) if days_remaining is not None else None,
            "estimated_depletion_date": depletion.isoformat() if depletion else None,
            "recommended_refill_date": refill_date.isoformat() if refill_date else None,
            "low_stock_threshold_days": threshold,
            "status": status,
            "is_active": medicine.is_active,
            "alert_message": cls._alert_message(medicine.name, days_remaining, status, threshold),
        }

    @staticmethod
    def _alert_message(name: str, days_remaining: float | None, status: str, threshold: int) -> str | None:
        if status == "empty":
            return f"{name} stock is empty. Please arrange a refill immediately."
        if status == "low" and days_remaining is not None:
            days = max(int(days_remaining), 0)
            return f"Your {name} is expected to finish in {days} day(s). Please arrange a refill."
        if status == "watch" and days_remaining is not None:
            return f"{name} stock is running low (~{int(days_remaining)} days left)."
        return None

    def list_predictions(self, active_only: bool = True) -> list[dict[str, Any]]:
        query = self.db.query(Medicine).filter(Medicine.user_id == self.user_id)
        if active_only:
            query = query.filter(Medicine.is_active.is_(True))
        medicines = query.order_by(Medicine.name.asc()).all()
        predictions = [self.predict(m) for m in medicines]
        order = {"empty": 0, "low": 1, "watch": 2, "ok": 3, "no_schedule": 4}
        predictions.sort(key=lambda p: (order.get(p["status"], 9), p["days_remaining"] or 999))
        return predictions

    def summary(self) -> dict[str, Any]:
        predictions = self.list_predictions()
        low = [p for p in predictions if p["status"] in ("empty", "low")]
        return {
            "total_tracked": len(predictions),
            "low_stock_count": len(low),
            "alerts": [p for p in predictions if p["alert_message"]],
            "predictions": predictions,
        }

    def consume_dose(self, medicine: Medicine) -> Medicine:
        """Decrement stock when a dose is marked taken/late."""
        per_dose = medicine.quantity_per_dose or 1.0
        current = float(medicine.stock_remaining or 0)
        medicine.stock_remaining = max(0.0, current - per_dose)
        return medicine

    def update_stock(
        self,
        medicine: Medicine,
        stock_remaining: float | None = None,
        quantity_total: float | None = None,
        quantity_per_dose: float | None = None,
        low_stock_threshold_days: int | None = None,
    ) -> dict[str, Any]:
        if quantity_total is not None:
            medicine.quantity_total = max(0.0, float(quantity_total))
        if stock_remaining is not None:
            medicine.stock_remaining = max(0.0, float(stock_remaining))
        elif quantity_total is not None and (medicine.stock_remaining or 0) <= 0:
            medicine.stock_remaining = medicine.quantity_total
        if quantity_per_dose is not None:
            medicine.quantity_per_dose = max(0.1, float(quantity_per_dose))
        if low_stock_threshold_days is not None:
            medicine.low_stock_threshold_days = max(1, int(low_stock_threshold_days))
        self.db.commit()
        self.db.refresh(medicine)
        return self.predict(medicine)

    def mark_refill_alerted(self, medicine: Medicine) -> None:
        medicine.last_refill_alert_at = datetime.utcnow()
        self.db.commit()

    def consumption_analytics(self, days: int = 30) -> dict[str, Any]:
        since = datetime.combine(today_local() - timedelta(days=days), datetime.min.time())
        records = (
            self.db.query(MedicationHistory)
            .filter(
                MedicationHistory.user_id == self.user_id,
                MedicationHistory.scheduled_datetime >= since,
                MedicationHistory.status.in_(TAKEN_STATUSES),
            )
            .all()
        )
        by_med: dict[int, int] = {}
        for r in records:
            by_med[r.medicine_id] = by_med.get(r.medicine_id, 0) + 1
        return {
            "period_days": days,
            "doses_taken": len(records),
            "by_medicine": by_med,
        }
