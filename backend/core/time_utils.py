"""Timezone-aware datetime helpers."""

import os
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")


def app_tz() -> ZoneInfo:
    return ZoneInfo(APP_TIMEZONE)


def now_local() -> datetime:
    return datetime.now(app_tz())


def today_local() -> date:
    return now_local().date()


def combine_local(day: date, t: time) -> datetime:
    """Store naive local wall-clock datetimes for schedule comparisons."""
    return datetime.combine(day, t)


def day_bounds(day: date) -> tuple[datetime, datetime]:
    return datetime.combine(day, time.min), datetime.combine(day, time.max)


def parse_date(date_str: str | None) -> date | None:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_time(time_str: str) -> time:
    parts = time_str.split(":")
    if len(parts) < 2:
        raise ValueError(f"Invalid time format: {time_str}")
    return time(int(parts[0]), int(parts[1]))


def week_start(day: date | None = None) -> date:
    day = day or today_local()
    return day - timedelta(days=day.weekday())
