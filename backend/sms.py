"""Public SMS pause endpoint — lets an SMS link pause reminders for 24h."""

import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
from models import UserPreference
from services.sms import verify_pause_code

router = APIRouter(prefix="/sms", tags=["SMS"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


@router.get("/pause")
def pause_sms(
    code: str = Query(..., min_length=8),
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    user_id = verify_pause_code(code)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired pause code")

    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if not pref:
        pref = UserPreference(user_id=user_id)
        db.add(pref)
    pref.sms_paused_until = datetime.utcnow() + timedelta(hours=hours)
    db.commit()

    return RedirectResponse(
        url=f"{FRONTEND_URL}/settings?tab=notifications&sms_paused=1&hours={hours}",
        status_code=303,
    )
