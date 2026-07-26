import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import engine, Base
from auth import router as auth_router, get_current_user
from medicines import router as medicines_router
from reminders import router as reminders_router
from scheduler import start_scheduler, stop_scheduler
from settings import router as settings_router
from models import User

load_dotenv()

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="PillSync API", version="2.0.0", lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(medicines_router)
app.include_router(reminders_router)
app.include_router(settings_router)


@app.get("/")
def root():
    return {"message": "PillSync API is running"}


@app.get("/reports/adherence")
def get_adherence(user: User = Depends(get_current_user)):
    from datetime import date, time, datetime, timedelta
    from database import get_db
    from models import MedicationHistory

    db = next(get_db())
    try:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

        week_start_dt = datetime.combine(week_start, time.min)
        today_end = datetime.combine(today, time.max)

        records = (
            db.query(MedicationHistory)
            .filter(
                MedicationHistory.user_id == user.id,
                MedicationHistory.scheduled_datetime >= week_start_dt,
                MedicationHistory.scheduled_datetime <= today_end,
            )
            .all()
        )

        total = len(records)
        taken = sum(1 for r in records if r.status in ("taken", "late"))
        missed = sum(1 for r in records if r.status == "missed")
        skipped = sum(1 for r in records if r.status == "skipped")
        pending = sum(1 for r in records if r.status == "pending")

        completed = taken + missed + skipped
        adherence = round(taken / completed * 100) if completed > 0 else (100 if total == 0 else 0)

        daily = {}
        for r in records:
            day = r.scheduled_datetime.date().isoformat()
            if day not in daily:
                daily[day] = {"total": 0, "taken": 0}
            daily[day]["total"] += 1
            if r.status in ("taken", "late"):
                daily[day]["taken"] += 1

        daily_adherence = []
        for i in range(7):
            day = (week_start + timedelta(days=i)).isoformat()
            if day in daily:
                d = daily[day]
                daily_adherence.append(round(d["taken"] / d["total"] * 100) if d["total"] > 0 else 0)
            else:
                daily_adherence.append(0)

        return {
            "daily_adherence": daily_adherence,
            "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "stats": {
                "total_scheduled": total,
                "taken": taken,
                "missed": missed,
                "skipped": skipped,
                "pending": pending,
                "adherence": adherence,
            },
        }
    finally:
        db.close()


@app.post("/fcm/register")
def register_fcm_token(
    data: dict,
    user: User = Depends(get_current_user),
):
    from database import get_db
    from models import DeviceToken

    db = next(get_db())
    try:
        token_str = data.get("fcm_token")
        device_type = data.get("device_type", "web")
        if not token_str:
            raise HTTPException(status_code=400, detail="fcm_token is required")

        existing = db.query(DeviceToken).filter(DeviceToken.fcm_token == token_str).first()
        if existing:
            existing.user_id = user.id
            existing.device_type = device_type
        else:
            token = DeviceToken(user_id=user.id, fcm_token=token_str, device_type=device_type)
            db.add(token)

        db.commit()
        return {"message": "FCM token registered successfully"}
    finally:
        db.close()


@app.post("/fcm/test")
def test_fcm(user: User = Depends(get_current_user)):
    """Development-only endpoint to test FCM push notifications."""
    from firebase_service import send_fcm_notification, get_firebase_app
    from database import get_db
    from models import DeviceToken

    db = next(get_db())
    try:
        token = db.query(DeviceToken).filter(DeviceToken.user_id == user.id).first()
        firebase_init = get_firebase_app() is not None
        device_count = db.query(DeviceToken).filter(DeviceToken.user_id == user.id).count()

        result = {
            "firebase_initialized": firebase_init,
            "registered_devices": device_count,
        }

        if not token:
            result["send_attempted"] = False
            return result

        sent = send_fcm_notification(
            token.fcm_token,
            "PillSync Test",
            "Push notifications are working.",
            {"type": "test"},
        )
        result["send_attempted"] = True
        result["send_successful"] = sent
        return result
    finally:
        db.close()
