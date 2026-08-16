"""Adherence analytics — reusable calculation engine."""

from collections import defaultdict
from datetime import timedelta

from sqlalchemy.orm import Session

from core.constants import STATUS_MISSED, STATUS_PENDING, STATUS_SKIPPED, TAKEN_STATUSES
from core.time_utils import day_bounds, today_local, week_start
from models import MedicationHistory, Medicine
from services.refill import RefillPredictionEngine


class AdherenceCalculator:
    """Encapsulates adherence percentage and weekly/monthly breakdown logic."""

    @staticmethod
    def compute_stats(records) -> dict:
        records = list(records)
        total = len(records)
        taken = sum(1 for r in records if r.status in TAKEN_STATUSES)
        pending = sum(1 for r in records if r.status == STATUS_PENDING)
        missed = sum(1 for r in records if r.status == STATUS_MISSED)
        skipped = sum(1 for r in records if r.status == STATUS_SKIPPED)
        late = sum(1 for r in records if r.status == "late")
        completed = taken + missed + skipped
        if completed > 0:
            adherence = round(taken / completed * 100)
        else:
            adherence = 100 if total == 0 else 0
        return {
            "total": total,
            "taken": taken,
            "pending": pending,
            "missed": missed,
            "skipped": skipped,
            "late": late,
            "adherence": adherence,
        }

    @staticmethod
    def dose_windows(records) -> dict:
        """Distribution of scheduled/taken/missed doses across day windows."""
        windows = {
            "Morning": {"scheduled": 0, "taken": 0, "missed": 0},
            "Afternoon": {"scheduled": 0, "taken": 0, "missed": 0},
            "Evening": {"scheduled": 0, "taken": 0, "missed": 0},
            "Night": {"scheduled": 0, "taken": 0, "missed": 0},
        }
        for record in records:
            hour = record.scheduled_datetime.hour
            if 5 <= hour < 11:
                key = "Morning"
            elif 11 <= hour < 17:
                key = "Afternoon"
            elif 17 <= hour < 23:
                key = "Evening"
            else:
                key = "Night"
            windows[key]["scheduled"] += 1
            if record.status in TAKEN_STATUSES:
                windows[key]["taken"] += 1
            elif record.status == STATUS_MISSED:
                windows[key]["missed"] += 1
        return windows

    @staticmethod
    def per_medicine(records) -> list:
        """Attribution of adherence per medicine, worst offenders first."""
        agg: dict[str, dict] = defaultdict(lambda: {"scheduled": 0, "taken": 0, "missed": 0, "skipped": 0})
        for record in records:
            med = record.medicine
            key = med.name if med else "Unknown"
            agg[key]["scheduled"] += 1
            if record.status in TAKEN_STATUSES:
                agg[key]["taken"] += 1
            elif record.status == STATUS_MISSED:
                agg[key]["missed"] += 1
            elif record.status == STATUS_SKIPPED:
                agg[key]["skipped"] += 1
        rows = []
        for name, counts in agg.items():
            completed = counts["taken"] + counts["missed"] + counts["skipped"]
            rows.append(
                {
                    "name": name,
                    **counts,
                    "adherence": round(counts["taken"] / completed * 100) if completed else 100,
                }
            )
        rows.sort(key=lambda r: r["missed"], reverse=True)
        return rows

    @staticmethod
    def compute_streak(records) -> int:
        """Consecutive days (ending today) with perfect completion of scheduled doses."""
        from collections import defaultdict

        daily: dict[str, dict] = defaultdict(lambda: {"total": 0, "taken": 0})
        for record in records:
            day_key = record.scheduled_datetime.date()
            daily[day_key]["total"] += 1
            if record.status in TAKEN_STATUSES:
                daily[day_key]["taken"] += 1

        today = today_local()
        streak = 0
        day = today
        if daily.get(day) and daily[day]["total"] > 0 and daily[day]["taken"] < daily[day]["total"]:
            # Today is still in progress; start counting from yesterday.
            day = day - timedelta(days=1)
        while daily.get(day) and daily[day]["total"] > 0 and daily[day]["taken"] == daily[day]["total"]:
            streak += 1
            day = day - timedelta(days=1)
        return streak

    @classmethod
    def _period_report(cls, db: Session, user_id: int, days: int, label_mode: str) -> dict:
        today = today_local()
        start = today - timedelta(days=days - 1)
        start_dt, _ = day_bounds(start)
        _, today_end = day_bounds(today)

        records = (
            db.query(MedicationHistory)
            .filter(
                MedicationHistory.user_id == user_id,
                MedicationHistory.scheduled_datetime >= start_dt,
                MedicationHistory.scheduled_datetime <= today_end,
            )
            .all()
        )

        stats = cls.compute_stats(records)
        daily: dict[str, dict] = defaultdict(lambda: {"total": 0, "taken": 0, "missed": 0})
        for record in records:
            day_key = record.scheduled_datetime.date().isoformat()
            daily[day_key]["total"] += 1
            if record.status in TAKEN_STATUSES:
                daily[day_key]["taken"] += 1
            if record.status == STATUS_MISSED:
                daily[day_key]["missed"] += 1

        labels = []
        daily_adherence = []
        missed_trend = []
        for i in range(days):
            day = start + timedelta(days=i)
            key = day.isoformat()
            if label_mode == "weekday":
                labels.append(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day.weekday()])
            else:
                labels.append(day.strftime("%d %b"))
            if key in daily and daily[key]["total"] > 0:
                daily_adherence.append(round(daily[key]["taken"] / daily[key]["total"] * 100))
                missed_trend.append(daily[key]["missed"])
            else:
                daily_adherence.append(0)
                missed_trend.append(0)

        return {
            "daily_adherence": daily_adherence,
            "missed_trend": missed_trend,
            "labels": labels,
            "stats": {
                "total_scheduled": stats["total"],
                "taken": stats["taken"],
                "missed": stats["missed"],
                "skipped": stats["skipped"],
                "pending": stats["pending"],
                "adherence": stats["adherence"],
            },
            "period_days": days,
            "dose_windows": cls.dose_windows(records),
            "per_medicine": cls.per_medicine(records),
            "expected_vs_taken": {
                "expected": stats["total"],
                "taken": stats["taken"],
                "difference": max(stats["total"] - stats["taken"], 0),
            },
        }

    @classmethod
    def weekly_report(cls, db: Session, user_id: int) -> dict:
        today = today_local()
        start = week_start(today)
        days = (today - start).days + 1
        week_start_dt, _ = day_bounds(start)
        _, today_end = day_bounds(today)
        records = (
            db.query(MedicationHistory)
            .filter(
                MedicationHistory.user_id == user_id,
                MedicationHistory.scheduled_datetime >= week_start_dt,
                MedicationHistory.scheduled_datetime <= today_end,
            )
            .all()
        )
        stats = cls.compute_stats(records)
        daily: dict[str, dict] = defaultdict(lambda: {"total": 0, "taken": 0, "missed": 0})
        for record in records:
            day_key = record.scheduled_datetime.date().isoformat()
            daily[day_key]["total"] += 1
            if record.status in TAKEN_STATUSES:
                daily[day_key]["taken"] += 1
            if record.status == STATUS_MISSED:
                daily[day_key]["missed"] += 1

        daily_adherence = []
        missed_trend = []
        for i in range(7):
            day = (start + timedelta(days=i)).isoformat()
            if day in daily and daily[day]["total"] > 0:
                daily_adherence.append(round(daily[day]["taken"] / daily[day]["total"] * 100))
                missed_trend.append(daily[day]["missed"])
            else:
                daily_adherence.append(0)
                missed_trend.append(0)

        refill = RefillPredictionEngine(db, user_id).summary()
        category_counts = (
            db.query(Medicine.disease_category)
            .filter(Medicine.user_id == user_id, Medicine.is_active.is_(True))
            .all()
        )
        by_category: dict[str, int] = defaultdict(int)
        for (cat,) in category_counts:
            by_category[cat or "General"] += 1

        return {
            "daily_adherence": daily_adherence,
            "missed_trend": missed_trend,
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "stats": {
                "total_scheduled": stats["total"],
                "taken": stats["taken"],
                "missed": stats["missed"],
                "skipped": stats["skipped"],
                "pending": stats["pending"],
                "adherence": stats["adherence"],
                "streak": cls.compute_streak(records),
            },
            "period_days": days,
            "refill_summary": {
                "total_tracked": refill["total_tracked"],
                "low_stock_count": refill["low_stock_count"],
                "alerts": refill["alerts"][:5],
            },
            "by_category": dict(by_category),
            "dose_windows": cls.dose_windows(records),
            "per_medicine": cls.per_medicine(records),
            "expected_vs_taken": {
                "expected": stats["total"],
                "taken": stats["taken"],
                "difference": max(stats["total"] - stats["taken"], 0),
            },
        }

    @classmethod
    def monthly_report(cls, db: Session, user_id: int) -> dict:
        report = cls._period_report(db, user_id, days=30, label_mode="date")
        refill = RefillPredictionEngine(db, user_id).summary()
        report["refill_summary"] = {
            "total_tracked": refill["total_tracked"],
            "low_stock_count": refill["low_stock_count"],
            "alerts": refill["alerts"][:5],
        }
        return report
