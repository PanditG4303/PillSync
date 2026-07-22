from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import UserPreference, User, DeviceToken
from auth import get_current_user
from firebase_service import send_fcm_notification

router = APIRouter(prefix="/settings", tags=["Settings"])


class PreferencesUpdate(BaseModel):
    push_notifications_enabled: Optional[bool] = None
    reminder_notifications_enabled: Optional[bool] = None
    advance_notice_minutes: Optional[int] = None


@router.get("/preferences")
def get_preferences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not pref:
        return {
            "push_notifications_enabled": True,
            "reminder_notifications_enabled": True,
            "advance_notice_minutes": 0,
        }
    return {
        "push_notifications_enabled": pref.push_notifications_enabled,
        "reminder_notifications_enabled": pref.reminder_notifications_enabled,
        "advance_notice_minutes": pref.advance_notice_minutes,
    }


@router.put("/preferences")
def update_preferences(
    data: PreferencesUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)

    if data.push_notifications_enabled is not None:
        pref.push_notifications_enabled = data.push_notifications_enabled
    if data.reminder_notifications_enabled is not None:
        pref.reminder_notifications_enabled = data.reminder_notifications_enabled
    if data.advance_notice_minutes is not None:
        pref.advance_notice_minutes = data.advance_notice_minutes

    pref.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Preferences updated successfully"}
