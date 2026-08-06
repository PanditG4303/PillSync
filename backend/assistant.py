"""Medication guide assistant — context-aware help from the user's medicines."""

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.security import get_current_user
from database import get_db
from models import Medicine, User
from services.refill import RefillPredictionEngine

router = APIRouter(prefix="/assistant", tags=["Assistant"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


@router.post("/chat")
def chat(
    data: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    medicines = (
        db.query(Medicine)
        .filter(Medicine.user_id == user.id, Medicine.is_active.is_(True))
        .all()
    )
    msg = data.message.strip().lower()
    refill = RefillPredictionEngine(db, user.id).summary()

    if any(k in msg for k in ("hello", "hi", "hey")):
        reply = (
            f"Hello {user.name.split()[0]}! I can help with your medication list, "
            "dosages, schedule, and refill status. What would you like to know?"
        )
    elif "refill" in msg or "stock" in msg:
        if not refill["predictions"]:
            reply = "You don't have medicines with stock tracking yet. Add quantity when creating a medicine."
        else:
            lines = []
            for p in refill["predictions"][:5]:
                days = p["days_remaining"]
                days_txt = f"{days} days left" if days is not None else "no schedule"
                lines.append(f"• {p['name']}: {p['stock_remaining']} units ({days_txt}) — {p['status']}")
            alerts = refill["alerts"][:3]
            extra = ""
            if alerts:
                extra = "\n\nAlerts:\n" + "\n".join(f"• {a['alert_message']}" for a in alerts)
            reply = "Refill overview:\n" + "\n".join(lines) + extra
    elif "schedule" in msg or "tomorrow" in msg or "when" in msg:
        if not medicines:
            reply = "No active medicines yet. Add medicines to see your schedule."
        else:
            lines = []
            for m in medicines:
                times = ", ".join(s.reminder_time.strftime("%H:%M") for s in m.schedules if s.is_active) or "no times"
                lines.append(f"• {m.name} {m.dosage}{m.dosage_unit}: {times}")
            reply = "Your active schedule:\n" + "\n".join(lines)
    elif "dosage" in msg or "dose" in msg or "how much" in msg:
        if not medicines:
            reply = "You don't have medicines added yet."
        else:
            lines = [f"• {m.name}: {m.dosage}{m.dosage_unit} ({m.quantity_per_dose} per dose)" for m in medicines]
            reply = "Current dosages:\n" + "\n".join(lines) + "\n\nAlways follow your clinician's instructions."
    elif "side effect" in msg or "interaction" in msg:
        reply = (
            "I can summarize your medication list, but I can't give medical advice about "
            "side effects or interactions. Please consult your doctor or pharmacist."
        )
    elif "prescription" in msg or "explain" in msg or "list" in msg:
        if not medicines:
            reply = "No medicines on file. Use Medicines or Scanner to add some."
        else:
            lines = []
            for m in medicines:
                lines.append(
                    f"• {m.name} {m.dosage}{m.dosage_unit} — {m.disease_category} — "
                    f"{len([s for s in m.schedules if s.is_active])} reminder(s)"
                )
            reply = "Your medications:\n" + "\n".join(lines)
    else:
        reply = (
            "I can help with: your dosages, schedule, refill/stock status, and medicine list. "
            "Ask something like “What are my dosages?” or “Any refill alerts?”"
        )

    return {
        "reply": reply,
        "disclaimer": "PillSync provides medication organization help, not medical advice.",
    }
