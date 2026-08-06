"""Lightweight schema migration for additive columns/tables."""

import logging

from sqlalchemy import inspect, text

logger = logging.getLogger("pillsync-migrate")

ADDITIVE_COLUMNS = {
    "users": {
        "role": "VARCHAR DEFAULT 'Patient'",
    },
    "medicines": {
        "disease_category": "VARCHAR DEFAULT 'General'",
        "quantity_total": "FLOAT DEFAULT 0",
        "stock_remaining": "FLOAT DEFAULT 0",
        "quantity_per_dose": "FLOAT DEFAULT 1",
        "low_stock_threshold_days": "INTEGER DEFAULT 5",
        "last_refill_alert_at": "DATETIME",
    },
    "user_preferences": {
        "refill_notifications_enabled": "BOOLEAN DEFAULT 1",
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
