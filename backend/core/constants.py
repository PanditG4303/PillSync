"""Application-wide constants and environment helpers."""

import os
import secrets

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT in ("production", "prod")

GRACE_PERIOD_MINUTES = 30
DEFAULT_REFILL_ALERT_DAYS = 5
MIN_PASSWORD_LENGTH = 8

STATUS_PENDING = "pending"
STATUS_TAKEN = "taken"
STATUS_LATE = "late"
STATUS_MISSED = "missed"
STATUS_SKIPPED = "skipped"

TAKEN_STATUSES = (STATUS_TAKEN, STATUS_LATE)
COMPLETED_STATUSES = (STATUS_TAKEN, STATUS_LATE, STATUS_MISSED, STATUS_SKIPPED)

ROLE_PATIENT = "Patient"
ROLE_CAREGIVER = "Caregiver"
ROLE_ADMIN = "Admin"
VALID_ROLES = (ROLE_PATIENT, ROLE_CAREGIVER, ROLE_ADMIN)
DEFAULT_ROLE = ROLE_PATIENT

DISEASE_CATEGORIES = (
    "Blood Pressure",
    "Diabetes",
    "Thyroid",
    "Antibiotics",
    "Vitamins",
    "Heart Medications",
    "General",
    "Other",
)

FREQUENCY_TO_TIMES = {
    "once daily": ["08:00"],
    "once a day": ["08:00"],
    "od": ["08:00"],
    "daily": ["08:00"],
    "twice daily": ["08:00", "20:00"],
    "twice a day": ["08:00", "20:00"],
    "bid": ["08:00", "20:00"],
    "bd": ["08:00", "20:00"],
    "thrice daily": ["08:00", "14:00", "20:00"],
    "three times daily": ["08:00", "14:00", "20:00"],
    "three times a day": ["08:00", "14:00", "20:00"],
    "tid": ["08:00", "14:00", "20:00"],
    "tds": ["08:00", "14:00", "20:00"],
    "four times daily": ["08:00", "12:00", "16:00", "20:00"],
    "qid": ["08:00", "12:00", "16:00", "20:00"],
    "every morning": ["08:00"],
    "every night": ["21:00"],
    "at bedtime": ["21:00"],
    "hs": ["21:00"],
}


def resolve_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "").strip()
    if secret and secret not in ("change-me-in-production", "pillsync-dev-secret-change-in-production"):
        return secret
    if IS_PRODUCTION:
        raise RuntimeError(
            "JWT_SECRET must be set to a strong random value in production. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    # Stable-enough local default so reloads don't invalidate tokens mid-dev
    return os.getenv("JWT_SECRET", "pillsync-dev-only-not-for-production")


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)
