"""SMTP email delivery for OTP codes and transactional mail."""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("pillsync-email")

EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "PillSync")


def email_configured() -> bool:
    return bool(os.getenv("SMTP_HOST", "").strip())


def _smtp_connection():
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    use_tls = os.getenv("SMTP_TLS", "true").lower() in ("1", "true", "yes")

    server = smtplib.SMTP(host, port, timeout=15)
    server.ehlo()
    if use_tls:
        server.starttls()
        server.ehlo()
    if user and password:
        server.login(user, password)
    return server


def send_email(to: str, subject: str, html: str) -> bool:
    """Send an HTML email. Returns False when SMTP is not configured."""
    if not email_configured():
        logger.warning("[EMAIL] SMTP not configured - email to %s not sent", to)
        return False

    from_email = os.getenv("SMTP_FROM", "").strip() or os.getenv("SMTP_USER", "").strip()
    if not from_email:
        logger.warning("[EMAIL] SMTP_FROM/SMTP_USER missing - email not sent")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{EMAIL_FROM_NAME} <{from_email}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))

        with _smtp_connection() as server:
            server.sendmail(from_email, [to], msg.as_string())
        logger.info("[EMAIL] Sent '%s' to %s", subject, to)
        return True
    except Exception as exc:
        logger.error("[EMAIL] Delivery failed: %s", exc)
        return False


def send_reminder_email(
    to: str,
    user_name: str,
    medicine_name: str,
    dosage: str,
    scheduled_time: str,
    is_advance: bool = False,
    snoozed: bool = False,
) -> bool:
    """Medicine reminder email — works for any recipient address."""
    if not email_configured() or not to:
        return False

    kind = "Upcoming" if is_advance else "Time to take"
    subject = f"{kind}: {medicine_name}" + (f" {dosage}" if dosage else "")

    action_line = (
        "This is a heads-up — your dose is due soon."
        if is_advance
        else "It's time to take this dose now."
    )
    snooze_line = (
        "This is a re-reminder after snoozing." if snoozed else ""
    )
    html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f1f3a">
  <div style="background:#071426;border-radius:16px 16px 0 0;padding:20px 28px">
    <p style="margin:0;color:#34d399;font-weight:700;font-size:18px">💊 PillSync</p>
  </div>
  <div style="border:1px solid #e5eaf2;border-top:none;border-radius:0 0 16px 16px;padding:24px 28px">
    <p style="margin:0 0 12px;font-size:15px">Hi {user_name or 'there'},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6">{action_line} {snooze_line}</p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 18px;margin-bottom:16px">
      <p style="margin:0;font-size:16px;font-weight:700">{medicine_name} {dosage}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#15803d">Scheduled for {scheduled_time}</p>
    </div>
    <p style="margin:0;font-size:12px;color:#5b78a9;line-height:1.6">
      Take the dose within 5 minutes of the scheduled time. After 10 minutes it is counted as missed.
      You can snooze a reminder from the app if you need a few extra minutes.
    </p>
  </div>
</div>
"""
    return send_email(to, subject, html)