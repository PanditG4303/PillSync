import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from core.constants import GRACE_PERIOD_MINUTES, STATUS_MISSED, STATUS_PENDING
from core.time_utils import APP_TIMEZONE, app_tz, combine_local, now_local
from database import SessionLocal
from models import Medicine, MedicationSchedule, MedicationHistory, DeviceToken, UserPreference
from services.reminders import ReminderService

scheduler = BackgroundScheduler()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pillsync-scheduler")

tz = app_tz()
_notified_today: set = set()
_last_cleanup_date = None


def send_notification(
    user_id: int,
    medicine_name: str,
    dosage: str,
    scheduled_time: str,
    medicine_id: int = 0,
    is_advance: bool = False,
):
    try:
        from firebase_service import send_fcm_notification

        db = SessionLocal()
        try:
            tokens = db.query(DeviceToken).filter(DeviceToken.user_id == user_id).all()
            if not tokens:
                logger.info("[FCM] No registered device token for user ID: %s", user_id)
                return

            if is_advance:
                title = "Upcoming Medicine Reminder"
                body = f"{medicine_name} {dosage} is due in a few minutes."
            else:
                title = "PillSync Medicine Reminder"
                body = f"Time to take {medicine_name} {dosage}"

            data = {
                "type": "medicine_reminder",
                "medicine_name": medicine_name,
                "dosage": dosage,
                "scheduled_time": scheduled_time,
                "medicine_id": str(medicine_id),
            }

            for token in tokens:
                try:
                    send_fcm_notification(
                        token.fcm_token,
                        title,
                        body,
                        data,
                    )
                except Exception as e:
                    logger.error("[FCM] Failed to send to one device for user %s: %s", user_id, e)
        finally:
            db.close()
    except ImportError:
        logger.warning("Firebase service not available, skipping notification")
    except Exception as e:
        logger.error("FCM notification error: %s", e)


def check_medications():
    global _last_cleanup_date, _notified_today

    db = SessionLocal()
    try:
        now = now_local()
        current_date = now.date()

        if _last_cleanup_date != current_date:
            _notified_today.clear()
            _last_cleanup_date = current_date

        current_time = now.time()
        current_weekday = now.weekday()
        logger.info(
            "[SCHEDULER] Tick: %02d:%02d:%02d (%s)",
            current_time.hour,
            current_time.minute,
            current_time.second,
            APP_TIMEZONE,
        )

        active_schedules = (
            db.query(MedicationSchedule)
            .join(Medicine)
            .filter(
                Medicine.is_active.is_(True),
                MedicationSchedule.is_active.is_(True),
            )
            .all()
        )

        for schedule in active_schedules:
            try:
                if not ReminderService.schedule_applies_today(schedule, current_weekday):
                    continue

                medicine = db.query(Medicine).filter(Medicine.id == schedule.medicine_id).first()
                if not medicine:
                    continue
                if medicine.start_date and medicine.start_date > current_date:
                    continue
                if medicine.end_date and medicine.end_date < current_date:
                    continue

                pref = db.query(UserPreference).filter(UserPreference.user_id == medicine.user_id).first()
                if pref and (not pref.push_notifications_enabled or not pref.reminder_notifications_enabled):
                    continue
                advance_minutes = pref.advance_notice_minutes if pref else 0

                notification_dt = combine_local(current_date, schedule.reminder_time) - timedelta(
                    minutes=advance_minutes or 0
                )
                notification_time = notification_dt.time()

                if (
                    notification_time.hour != current_time.hour
                    or notification_time.minute != current_time.minute
                ):
                    continue

                dedup_key = (schedule.id, current_date.isoformat())
                if dedup_key in _notified_today:
                    continue
                _notified_today.add(dedup_key)

                scheduled_datetime = combine_local(current_date, schedule.reminder_time)
                existing = (
                    db.query(MedicationHistory)
                    .filter(
                        MedicationHistory.schedule_id == schedule.id,
                        MedicationHistory.scheduled_datetime == scheduled_datetime,
                    )
                    .first()
                )
                if not existing:
                    db.add(
                        MedicationHistory(
                            user_id=medicine.user_id,
                            medicine_id=medicine.id,
                            schedule_id=schedule.id,
                            scheduled_datetime=scheduled_datetime,
                            status=STATUS_PENDING,
                        )
                    )
                    db.commit()

                dosage_str = f"{medicine.dosage} {medicine.dosage_unit}".strip()
                send_notification(
                    medicine.user_id,
                    medicine.name,
                    dosage_str,
                    schedule.reminder_time.strftime("%H:%M"),
                    medicine_id=medicine.id,
                    is_advance=(advance_minutes or 0) > 0,
                )
                logger.info(
                    "Sent reminder for %s - user %s (advance: %sm)",
                    medicine.name,
                    medicine.user_id,
                    advance_minutes or 0,
                )
            except Exception as e:
                logger.error("Schedule processing error for schedule %s: %s", schedule.id, e)

    except Exception as e:
        logger.error("Scheduler error: %s", e)
    finally:
        db.close()


def mark_missed_doses():
    db = SessionLocal()
    try:
        cutoff = datetime.now() - timedelta(minutes=GRACE_PERIOD_MINUTES)
        pending = (
            db.query(MedicationHistory)
            .filter(
                MedicationHistory.status == STATUS_PENDING,
                MedicationHistory.scheduled_datetime < cutoff,
            )
            .all()
        )
        for record in pending:
            record.status = STATUS_MISSED
        if pending:
            db.commit()
            logger.info("Marked %s doses as missed", len(pending))
    except Exception as e:
        logger.error("Missed dose check error: %s", e)
    finally:
        db.close()


def check_refill_alerts():
    """Send low-stock refill notifications at most once per day per medicine."""
    db = SessionLocal()
    try:
        from firebase_service import send_fcm_notification
        from services.refill import RefillPredictionEngine

        medicines = db.query(Medicine).filter(Medicine.is_active.is_(True)).all()
        today = now_local().date()

        for medicine in medicines:
            try:
                pref = db.query(UserPreference).filter(UserPreference.user_id == medicine.user_id).first()
                if pref and (
                    not pref.push_notifications_enabled
                    or not getattr(pref, "refill_notifications_enabled", True)
                ):
                    continue

                prediction = RefillPredictionEngine.predict(medicine)
                if prediction["status"] not in ("empty", "low"):
                    continue

                if medicine.last_refill_alert_at and medicine.last_refill_alert_at.date() == today:
                    continue

                tokens = db.query(DeviceToken).filter(DeviceToken.user_id == medicine.user_id).all()
                body = prediction["alert_message"] or f"Refill needed for {medicine.name}"
                for token in tokens:
                    send_fcm_notification(
                        token.fcm_token,
                        "Refill Alert",
                        body,
                        {"type": "refill_alert", "medicine_id": str(medicine.id)},
                    )

                medicine.last_refill_alert_at = datetime.utcnow()
                db.commit()
                logger.info("Refill alert sent for %s (user %s)", medicine.name, medicine.user_id)
            except Exception as e:
                logger.error("Refill alert error for medicine %s: %s", medicine.id, e)
    except Exception as e:
        logger.error("Refill alert job error: %s", e)
    finally:
        db.close()


def start_scheduler():
    if scheduler.get_job("check_medications"):
        return
    scheduler.add_job(check_medications, "interval", seconds=30, id="check_medications")
    scheduler.add_job(mark_missed_doses, "interval", seconds=60, id="mark_missed")
    scheduler.add_job(check_refill_alerts, "interval", minutes=30, id="check_refills")
    scheduler.start()
    logger.info("PillSync scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("PillSync scheduler stopped")
