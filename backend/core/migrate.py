"""Lightweight schema migration for additive columns/tables."""

import logging

from sqlalchemy import inspect, text

logger = logging.getLogger("pillsync-migrate")

ADDITIVE_COLUMNS = {
    "users": {
        "role": "VARCHAR DEFAULT 'Patient'",
        "profile_picture": "VARCHAR DEFAULT ''",
        "auth_provider": "VARCHAR DEFAULT 'email'",
    },
    "auth_tokens": {
        "created_at": "DATETIME",
    },
    "ai_settings": {
        "updated_at": "DATETIME",
    },
    "medicines": {
        "disease_category": "VARCHAR DEFAULT 'General'",
        "quantity_total": "FLOAT DEFAULT 0",
        "stock_remaining": "FLOAT DEFAULT 0",
        "quantity_per_dose": "FLOAT DEFAULT 1",
        "low_stock_threshold_days": "INTEGER DEFAULT 5",
        "last_refill_alert_at": "DATETIME",
        "duration": "VARCHAR DEFAULT ''",
        "doctor_notes": "TEXT DEFAULT ''",
        "batch_number": "VARCHAR DEFAULT ''",
        "expiry_date": "VARCHAR DEFAULT ''",
        "prescription_date": "VARCHAR DEFAULT ''",
    },
    "user_preferences": {
        "refill_notifications_enabled": "BOOLEAN DEFAULT 1",
        "theme": "VARCHAR DEFAULT 'dark'",
        "language": "VARCHAR DEFAULT 'en'",
        "sound_alerts_enabled": "BOOLEAN DEFAULT 1",
        "email_notifications_enabled": "BOOLEAN DEFAULT 1",
        "sms_notifications_enabled": "BOOLEAN DEFAULT 0",
        "sms_phone": "VARCHAR DEFAULT ''",
        "sms_paused_until": "DATETIME",
        "ocr_default_times_source": "VARCHAR DEFAULT 'system'",
        "timezone": "VARCHAR DEFAULT ''",
    },
    "medication_history": {
        "snoozed_until": "DATETIME",
        "last_notified_at": "DATETIME",
    },
}


def run_migrations(engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table, columns in ADDITIVE_COLUMNS.items():
            if table not in existing_tables:
                continue
            existing = {col["name"] for col in inspector.get_columns(table)}
            for column, col_type in columns.items():
                if column in existing:
                    continue
                ddl = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
                logger.info("Migrating: %s", ddl)
                conn.execute(text(ddl))
