"""Notification history endpoints (in-app notification center)."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.security import get_current_user
from database import get_db
from models import Notification, User
from services.notifications import list_notifications, to_dict

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_notifications(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = list_notifications(db, user.id, limit=limit)
    unread = sum(1 for r in records if not r.is_read)
    return {
        "notifications": [to_dict(r) for r in records],
        "unread_count": unread,
        "total": len(records),
    }


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Notification not found")
    record.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return {"message": "All notifications marked as read", "updated": updated}


@router.delete("")
def clear_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    removed = db.query(Notification).filter(Notification.user_id == user.id).delete()
    db.commit()
    return {"message": "Notification history cleared", "removed": removed}
