"""Optional SMS reminders behind a provider abstraction (MSG91 / Fast2SMS).

The whole module is inert unless SMS_PROVIDER is set and the matching
credentials exist, so the app keeps working with no SMS configuration —
browser and Firebase notifications continue to work as usual.
"""

import hashlib
import hmac
import logging
import os
from typing import Optional

import httpx

from core.constants import resolve_jwt_secret

logger = logging.getLogger("pillsync-sms")

SUPPORTED_PROVIDERS = ("msg91", "fast2sms")

MSG91_ENDPOINT = "https://api.msg91.com/api/sendhttp.php"
FAST2SMS_ENDPOINT = "https://www.fast2sms.com/dev/bulkV2"

REQUEST_TIMEOUT_SECONDS = 15

PHONE_MAX_LENGTH = 20


def get_provider() -> Optional[str]:
    provider = os.getenv("SMS_PROVIDER", "").strip().lower()
    if provider not in SUPPORTED_PROVIDERS:
        return None
    return provider


def is_configured() -> bool:
    """True only when a provider is selected AND all its credentials exist."""
    provider = get_provider()
    if provider == "msg91":
        return bool(
            os.getenv("MSG91_AUTH_KEY", "").strip()
            and os.getenv("MSG91_SENDER_ID", "").strip()
        )
    if provider == "fast2sms":
        return bool(
            os.getenv("FAST2SMS_API_KEY", "").strip()
            and os.getenv("FAST2SMS_SENDER_ID", "").strip()
        )
    return False


def _normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit() or ch == "+")
    return digits[:PHONE_MAX_LENGTH]


def _send_msg91(phone: str, message: str) -> bool:
    params = {
        "authkey": os.getenv("MSG91_AUTH_KEY", "").strip(),
        "mobiles": phone,
        "sender": os.getenv("MSG91_SENDER_ID", "").strip(),
        "message": message,
        "route": "4",  # transactional
        "country": "91",
    }
    with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        response = client.get(MSG91_ENDPOINT, params=params)
    if response.status_code >= 400:
        logger.warning("MSG91 SMS failed: HTTP %s", response.status_code)
        return False
    return True


def _send_fast2sms(phone: str, message: str) -> bool:
    headers = {
        "authorization": os.getenv("FAST2SMS_API_KEY", "").strip(),
        "Content-Type": "application/json",
    }
    payload = {
        "route": "otp",
        "sender_id": os.getenv("FAST2SMS_SENDER_ID", "").strip(),
        "message": message,
        "numbers": phone,
    }
    with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        response = client.post(FAST2SMS_ENDPOINT, headers=headers, json=payload)
    if response.status_code >= 400:
        logger.warning("Fast2SMS failed: HTTP %s", response.status_code)
        return False
    return True


def build_pause_code(user_id: int, hours: int = 24) -> str:
    """Signed launch code that lets a user pause SMS reminders without logging in."""
    payload = f"{user_id}:{int(hours)}"
    signature = hmac.new(
        resolve_jwt_secret().encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:16]
    return f"{payload}:{signature}"


def verify_pause_code(code: str, max_age_hours: int = 168) -> Optional[int]:
    """Returns the user id for a valid pause code, None otherwise."""
    parts = (code or "").split(":")
    if len(parts) != 3:
        return None
    user_id_str, hours_str, signature = parts
    try:
        user_id = int(user_id_str)
        hours = int(hours_str)
    except ValueError:
        return None
    if hours <= 0 or hours > 24 * 7:
        return None
    expected = hmac.new(
        resolve_jwt_secret().encode("utf-8"),
        f"{user_id_str}:{hours_str}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:16]
    if not hmac.compare_digest(expected, signature):
        return None
    return user_id


def build_reminder_sms(user_name: str, body: str, pause_code: str) -> str:
    """Reminder text with a personalized greeting and a one-tap pause link."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    greeting = f"Hi {user_name}, " if user_name.strip() else ""
    return (
        f"{greeting}{body} - PillSync\n"
        f"Pause SMS 24h: {frontend_url}/sms/pause?code={pause_code}\n"
        f"Manage alerts: {frontend_url}/settings"
    )


def send_sms(phone: str, message: str) -> bool:
    """Send an SMS through the configured provider.

    Returns False (never raises) when SMS is not configured or sending fails,
    so reminder flows are never broken by an SMS problem.
    """
    if not is_configured():
        return False

    clean_phone = _normalize_phone(phone)
    if len(clean_phone) < 7:
        logger.info("SMS skipped: no valid phone number")
        return False

    provider = get_provider()
    try:
        if provider == "msg91":
            return _send_msg91(clean_phone, message)
        if provider == "fast2sms":
            return _send_fast2sms(clean_phone, message)
    except httpx.HTTPError as exc:
        logger.warning("SMS provider request failed: %s", exc.__class__.__name__)
    except Exception as exc:  # provider payload/parse errors must never propagate
        logger.error("SMS send error: %s", exc)
    return False
