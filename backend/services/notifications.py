"""Server-side notification history helper."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from models import Notification


def create_notification(
    db: Session,
    user_id: int,
    *,
    type: str = "reminder",
    title: str = "",
    body: str = "",
    medicine_id: int | None = None,
    history_id: int | None = None,
) -> Notification:
    record = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        medicine_id=medicine_id,
        history_id=history_id,
        is_read=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_notifications(db: Session, user_id: int, limit: int = 50) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
        .all()
    )


def to_dict(record: Notification) -> dict:
    return {
        "id": record.id,
        "type": record.type,
        "title": record.title,
        "body": record.body,
        "medicine_id": record.medicine_id,
        "history_id": record.history_id,
        "is_read": record.is_read,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


def unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read.is_(False))
        .count()
    )
