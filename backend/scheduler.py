import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from core.constants import GRACE_PERIOD_MINUTES, STATUS_MISSED, STATUS_PENDING
from core.time_utils import APP_TIMEZONE, app_tz, combine_local, day_bounds, now_local
from database import SessionLocal
from models import (
    MedicationHistory,
    MedicationSchedule,
    Medicine,
    DeviceToken,
    UserPreference,
    User,
)
from services.notifications import create_notification
from services.reminders import ReminderService

scheduler = BackgroundScheduler()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pillsync-scheduler")

tz = app_tz()
_notified_today: set = set()
_last_cleanup_date = None

REPEAT_NOTIFY_MINUTES = 10


def send_notification(
    user_id: int,
    medicine_name: str,
    dosage: str,
    scheduled_time: str,
    medicine_id: int = 0,
    history_id: int | None = None,
    is_advance: bool = False,
    snoozed: bool = False,
):
    try:
        from firebase_service import send_fcm_notification

        db = SessionLocal()
        try:
            if is_advance:
                title = "Upcoming Medicine Reminder"
                body = f"{medicine_name} {dosage} is due in a few minutes."
            else:
                title = "PillSync Medicine Reminder"
                body = f"Time to take {medicine_name} {dosage}"

            # Always record the in-app notification, even when the user has no
            # registered FCM device — the notification center must stay in sync.
            create_notification(
                db,
                user_id,
                type="reminder",
                title=title,
                body=body,
                medicine_id=medicine_id or None,
                history_id=history_id,
            )

            data = {
                "type": "medicine_reminder",
                "medicine_name": medicine_name,
                "dosage": dosage,
                "scheduled_time": scheduled_time,
                "medicine_id": str(medicine_id),
            }
            if history_id is not None:
                data["history_id"] = str(history_id)

            tokens = db.query(DeviceToken).filter(DeviceToken.user_id == user_id).all()
            if not tokens:
                logger.info("[FCM] No registered device token for user ID: %s", user_id)

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

            # Email reminder — sent when the user enabled it and SMTP is set up.
            try:
                from services.email import email_configured, send_reminder_email

                if email_configured():
                    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
                    if pref and pref.email_notifications_enabled:
                        user = db.query(User).filter(User.id == user_id).first()
                        if user and user.email:
                            send_reminder_email(
                                user.email,
                                user.name or "",
                                medicine_name,
                                dosage,
                                scheduled_time,
                                is_advance=is_advance,
                                snoozed=snoozed,
                            )
            except Exception as e:
                logger.error("[EMAIL] Reminder email error for user %s: %s", user_id, e)

            # Optional SMS reminder — silently skipped when not configured.
            try:
                from services import sms

                if sms.is_configured():
                    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
                    if pref and pref.sms_notifications_enabled and pref.sms_phone:
                        paused_until = getattr(pref, "sms_paused_until", None)
                        if paused_until and paused_until > datetime.utcnow():
                            logger.info(
                                "[SMS] Skipped for user %s (paused until %s)",
                                user_id,
                                paused_until,
                            )
                        else:
                            user = db.query(User).filter(User.id == user_id).first()
                            user_name = (user.name if user else "") or ""
                            message = sms.build_reminder_sms(
                                user_name,
                                body,
                                sms.build_pause_code(user_id),
                            )
                            sms.send_sms(pref.sms_phone, message)
            except Exception as e:
                logger.error("[SMS] Reminder SMS error for user %s: %s", user_id, e)
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
        naive_now = now.replace(tzinfo=None)
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
                    existing = MedicationHistory(
                        user_id=medicine.user_id,
                        medicine_id=medicine.id,
                        schedule_id=schedule.id,
                        scheduled_datetime=scheduled_datetime,
                        status=STATUS_PENDING,
                    )
                    db.add(existing)
                    db.commit()
                    db.refresh(existing)

                existing.last_notified_at = datetime.utcnow()
                db.commit()

                dosage_str = f"{medicine.dosage} {medicine.dosage_unit}".strip()
                send_notification(
                    medicine.user_id,
                    medicine.name,
                    dosage_str,
                    schedule.reminder_time.strftime("%H:%M"),
                    medicine_id=medicine.id,
                    history_id=existing.id,
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

        _resend_pending_reminders(db, current_date, naive_now)
    except Exception as e:
        logger.error("Scheduler error: %s", e)
    finally:
        db.close()


def _resend_pending_reminders(db, current_date, now) -> None:
    """Repeat FCM reminders for doses that are still pending and due.

    Re-sends at most once every REPEAT_NOTIFY_MINUTES, skipping snoozed
    reminders, so notifications keep appearing until Taken or Skipped.
    """
    day_start, day_end = day_bounds(current_date)
    pending = (
        db.query(MedicationHistory)
        .filter(
            MedicationHistory.scheduled_datetime >= day_start,
            MedicationHistory.scheduled_datetime <= day_end,
            MedicationHistory.scheduled_datetime <= now,
            MedicationHistory.status == STATUS_PENDING,
        )
        .all()
    )

    cutoff = datetime.utcnow() - timedelta(minutes=REPEAT_NOTIFY_MINUTES)
    for record in pending:
        try:
            if record.snoozed_until and record.snoozed_until > now:
                continue
            if record.last_notified_at and record.last_notified_at > cutoff:
                continue

            medicine = db.query(Medicine).filter(Medicine.id == record.medicine_id).first()
            if not medicine or not medicine.is_active:
                continue

            pref = (
                db.query(UserPreference)
                .filter(UserPreference.user_id == record.user_id)
                .first()
            )
            if pref and (
                not pref.push_notifications_enabled
                or not pref.reminder_notifications_enabled
            ):
                continue

            record.last_notified_at = datetime.utcnow()
            db.commit()

            dosage_str = f"{medicine.dosage} {medicine.dosage_unit}".strip()
            send_notification(
                record.user_id,
                medicine.name,
                dosage_str,
                record.scheduled_datetime.strftime("%H:%M"),
                medicine_id=medicine.id,
                history_id=record.id,
                snoozed=bool(record.snoozed_until and record.snoozed_until > now),
            )
            logger.info("Re-sent reminder for history record %s", record.id)
        except Exception as e:
            logger.error("Repeat notification error for record %s: %s", record.id, e)


def mark_missed_doses():
    db = SessionLocal()
    try:
        now = now_local().replace(tzinfo=None)
        pending = (
            db.query(MedicationHistory)
            .filter(MedicationHistory.status == STATUS_PENDING)
            .all()
        )
        missed = 0
        for record in pending:
            base = record.scheduled_datetime
            if record.snoozed_until and record.snoozed_until > base:
                base = record.snoozed_until
            if base + timedelta(minutes=GRACE_PERIOD_MINUTES) < now:
                record.status = STATUS_MISSED
                missed += 1
                medicine = db.query(Medicine).filter(Medicine.id == record.medicine_id).first()
                create_notification(
                    db,
                    record.user_id,
                    type="reminder",
                    title="Dose Marked Missed",
                    body=(
                        f"{medicine.name} was not taken within 10 minutes and has been "
                        f"counted as missed."
                        if medicine
                        else "A dose was not taken within 10 minutes and has been counted as missed."
                    ),
                    medicine_id=record.medicine_id,
                    history_id=record.id,
                )
        if missed:
            db.commit()
            logger.info("Marked %s doses as missed", missed)
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
                create_notification(
                    db,
                    medicine.user_id,
                    type="refill",
                    title="Refill Alert",
                    body=body,
                    medicine_id=medicine.id,
                )
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
