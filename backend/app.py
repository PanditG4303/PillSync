import os
from contextlib import asynccontextmanager

from typing import Optional
from fastapi import FastAPI, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine, Base, get_db, SessionLocal
from core.migrate import run_migrations
from core.constants import IS_PRODUCTION
from core.rate_limit import client_key, limiter
from auth import router as auth_router
from medicines import router as medicines_router
from reminders import router as reminders_router
from settings import router as settings_router
from ocr import router as ocr_router
from refills import router as refills_router
from assistant import router as assistant_router
from admin import router as admin_router
from scheduler import start_scheduler, stop_scheduler
from models import User, DeviceToken

from core.security import get_current_user, resolve_target_user_id
from services.adherence import AdherenceCalculator
from firebase_service import send_fcm_notification, get_firebase_app

load_dotenv()

Base.metadata.create_all(bind=engine)
run_migrations(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="PillSync API",
    version="3.1.0",
    lifespan=lifespan,
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
cors_origins = [FRONTEND_URL]
if not IS_PRODUCTION:
    for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        if origin not in cors_origins:
            cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(medicines_router)
app.include_router(reminders_router)
app.include_router(settings_router)
app.include_router(ocr_router)
app.include_router(refills_router)
app.include_router(assistant_router)
app.include_router(admin_router)


class FcmRegisterRequest(BaseModel):
    fcm_token: str = Field(..., min_length=1)
    device_type: str = "web"


@app.get("/")
def root():
    return {"message": "PillSync API is running", "version": "3.1.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
        return {"status": "ready"}
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "detail": str(exc)},
        )


@app.get("/reports/adherence")
def get_adherence(
    period: str = Query("week", pattern="^(week|month)$"),
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    if period == "month":
        return AdherenceCalculator.monthly_report(db, target_id)
    return AdherenceCalculator.weekly_report(db, target_id)


@app.post("/fcm/register")
def register_fcm_token(
    data: FcmRegisterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(DeviceToken).filter(DeviceToken.fcm_token == data.fcm_token).first()
    if existing:
        existing.user_id = user.id
        existing.device_type = data.device_type
    else:
        db.add(
            DeviceToken(
                user_id=user.id,
                fcm_token=data.fcm_token,
                device_type=data.device_type,
            )
        )
    db.commit()
    return {"message": "FCM token registered successfully"}


@app.post("/fcm/test")
def test_fcm(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if IS_PRODUCTION:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Not found")

    limiter.check(client_key(request, "fcm-test"), limit=5, window_seconds=60)
    tokens = db.query(DeviceToken).filter(DeviceToken.user_id == user.id).all()
    result = {
        "firebase_initialized": get_firebase_app() is not None,
        "registered_devices": len(tokens),
        "send_attempted": False,
        "send_successful": False,
    }

    if not tokens:
        return result

    result["send_attempted"] = True
    result["send_successful"] = send_fcm_notification(
        tokens[0].fcm_token,
        "PillSync Test",
        "Push notifications are working.",
        {"type": "test"},
    )
    return result
