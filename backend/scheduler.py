import logging
import os
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Medicine, MedicationSchedule, MedicationHistory, DeviceToken, UserPreference

scheduler = BackgroundScheduler()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pillsync-scheduler")

GRACE_PERIOD_MINUTES = 30
APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")
tz = ZoneInfo(APP_TIMEZONE)

_notified_today = set()
_last_cleanup_date = None


def send_notification(user_id: int, medicine_name: str, dosage: str, scheduled_time: str, is_advance: bool = False):
    try:
        from firebase_service import send_fcm_notification
        db = SessionLocal()
        try:
            tokens = db.query(DeviceToken).filter(DeviceToken.user_id == user_id).all()
            if not tokens:
                logger.info(f"[FCM] No registered device token for user ID: {user_id}")
                return
            logger.info(f"[FCM] Sending reminder to {len(tokens)} registered device(s)")
            if is_advance:
                title = "Upcoming Medicine Reminder"
                body = f"{medicine_name} {dosage} is due in a few minutes."
            else:
                title = "Medicine Reminder"
                body = f"Time to take {medicine_name} {dosage} at {scheduled_time}"
            for token in tokens:
                try:
                    send_fcm_notification(
                        token.fcm_token,
                        title,
                        body,
                        {"type": "medicine_reminder"},
                    )
                except Exception as e:
                    logger.error(f"[FCM] Failed to send to one device for user {user_id}: {e}")
                    continue
        finally:
            db.close()
    except ImportError:
        logger.warning("Firebase service not available, skipping notification")
    except Exception as e:
        logger.error(f"FCM notification error: {e}")


def check_medications():
    global _last_cleanup_date, _notified_today

    db = SessionLocal()
    try:
        now = datetime.now(tz)
        current_date = now.date()

        if _last_cleanup_date != current_date:
            _notified_today.clear()
            _last_cleanup_date = current_date

        current_time = now.time()
        logger.info(f"[SCHEDULER] Tick: {current_time.hour:02d}:{current_time.minute:02d}:{current_time.second:02d}")

        current_weekday = now.weekday()

        active_schedules = (
            db.query(MedicationSchedule)
            .join(Medicine)
            .filter(
                Medicine.is_active == True,
                MedicationSchedule.is_active == True,
            )
            .all()
        )

        for schedule in active_schedules:
            try:
                if schedule.days_of_week:
                    days = [int(d.strip()) for d in schedule.days_of_week.split(",")]
                    if current_weekday not in days:
                        continue

                medicine = db.query(Medicine).filter(Medicine.id == schedule.medicine_id).first()
                if not medicine:
                    continue

                if medicine.start_date and medicine.start_date > current_date:
                    continue
                if medicine.end_date and medicine.end_date < current_date:
                    continue

                pref = db.query(UserPreference).filter(UserPreference.user_id == medicine.user_id).first()
                if pref:
                    if not pref.push_notifications_enabled or not pref.reminder_notifications_enabled:
                        continue
                    advance_minutes = pref.advance_notice_minutes or 0
                else:
                    advance_minutes = 0

                notification_dt = datetime.combine(current_date, schedule.reminder_time) - timedelta(minutes=advance_minutes)
                notification_time = notification_dt.time()

                if notification_time.hour != current_time.hour or notification_time.minute != current_time.minute:
                    continue

                dedup_key = (schedule.id, current_date.isoformat())
                if dedup_key in _notified_today:
                    continue
                _notified_today.add(dedup_key)

                scheduled_datetime = datetime.combine(current_date, schedule.reminder_time)

                existing = (
                    db.query(MedicationHistory)
                    .filter(
                        MedicationHistory.schedule_id == schedule.id,
                        MedicationHistory.scheduled_datetime == scheduled_datetime,
                    )
                    .first()
                )
                if not existing:
                    history = MedicationHistory(
                        user_id=medicine.user_id,
                        medicine_id=medicine.id,
                        schedule_id=schedule.id,
                        scheduled_datetime=scheduled_datetime,
                        status="pending",
                    )
                    db.add(history)
                    db.commit()

                dosage_str = f"{medicine.dosage} {medicine.dosage_unit}".strip()
                send_notification(
                    medicine.user_id,
                    medicine.name,
                    dosage_str,
                    schedule.reminder_time.strftime("%H:%M"),
                    is_advance=(advance_minutes > 0),
                )
                logger.info(f"Sent reminder for {medicine.name} - user {medicine.user_id} (advance: {advance_minutes}m)")
            except Exception as e:
                logger.error(f"Schedule processing error for schedule {schedule.id}: {e}")
                continue

    except Exception as e:
        logger.error(f"Scheduler error: {e}")
    finally:
        db.close()


def mark_missed_doses():
    db = SessionLocal()
    try:
        now = datetime.now(tz)
        cutoff = now - timedelta(minutes=GRACE_PERIOD_MINUTES)
        cutoff_naive = cutoff.replace(tzinfo=None)
        pending = (
            db.query(MedicationHistory)
            .filter(
                MedicationHistory.status == "pending",
                MedicationHistory.scheduled_datetime < cutoff_naive,
            )
            .all()
        )
        for record in pending:
            record.status = "missed"
        if pending:
            db.commit()
            logger.info(f"Marked {len(pending)} doses as missed")
    except Exception as e:
        logger.error(f"Missed dose check error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(check_medications, "interval", seconds=30, id="check_medications")
    scheduler.add_job(mark_missed_doses, "interval", seconds=60, id="mark_missed")
    scheduler.start()
    logger.info("PillSync scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("PillSync scheduler stopped")
