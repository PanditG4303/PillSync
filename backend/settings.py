from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security import get_current_user
from database import get_db
from models import UserPreference, User

router = APIRouter(prefix="/settings", tags=["Settings"])


class PreferencesUpdate(BaseModel):
    push_notifications_enabled: Optional[bool] = None
    reminder_notifications_enabled: Optional[bool] = None
    refill_notifications_enabled: Optional[bool] = None
    advance_notice_minutes: Optional[int] = Field(default=None, ge=0, le=120)


DEFAULT_PREFS = {
    "push_notifications_enabled": True,
    "reminder_notifications_enabled": True,
    "refill_notifications_enabled": True,
    "advance_notice_minutes": 0,
}


def _prefs_dict(pref: UserPreference | None) -> dict:
    if not pref:
        return dict(DEFAULT_PREFS)
    return {
        "push_notifications_enabled": pref.push_notifications_enabled,
        "reminder_notifications_enabled": pref.reminder_notifications_enabled,
        "refill_notifications_enabled": getattr(pref, "refill_notifications_enabled", True),
        "advance_notice_minutes": pref.advance_notice_minutes,
    }


@router.get("/preferences")
def get_preferences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    return _prefs_dict(pref)


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

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(pref, key, value)

    pref.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Preferences updated successfully", **_prefs_dict(pref)}
