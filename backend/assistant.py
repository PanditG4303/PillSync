"""Medication guide assistant — context-aware help from the user's medicines.

Routes every request through the central AI service (see services/ai_service.py):
lifestyle questions use the lifestyle model, everything else uses the medicine
chat model. Falls back to a rule-based engine when the AI service is
unavailable or not configured, so the assistant always answers.
"""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security import get_current_user
from core.time_utils import day_bounds, today_local
from database import get_db
from models import MedicationHistory, Medicine, User
from services.ai_service import MEDICAL_DISCLAIMER, ai_service
from services.ai_config import TASK_ASSISTANT, model_for
from services.refill import RefillPredictionEngine

logger = logging.getLogger("pillsync-assistant")

router = APIRouter(prefix="/assistant", tags=["Assistant"])

MAX_HISTORY_TURNS = 8


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[ChatMessage] = []


def _build_context(db: Session, user: User, medicines: list[Medicine], refill: dict) -> dict:
    """Gather the user's real data for the AI system prompt."""
    today = today_local()
    day_start, day_end = day_bounds(today)
    today_records = (
        db.query(MedicationHistory)
        .filter(
            MedicationHistory.user_id == user.id,
            MedicationHistory.scheduled_datetime >= day_start,
            MedicationHistory.scheduled_datetime <= day_end,
        )
        .order_by(MedicationHistory.scheduled_datetime.asc())
        .all()
    )

    meds = []
    for m in medicines:
        meds.append(
            {
                "name": m.name,
                "dosage": f"{m.dosage}{m.dosage_unit}".strip(),
                "medicine_type": m.medicine_type,
                "disease_category": m.disease_category,
                "instructions": m.instructions or None,
                "duration": getattr(m, "duration", None) or None,
                "quantity_per_dose": m.quantity_per_dose,
                "stock_remaining": m.stock_remaining,
                "schedule": [
                    f"{s.reminder_time.strftime('%H:%M')} ({s.days_of_week})"
                    if s.days_of_week
                    else s.reminder_time.strftime("%H:%M")
                    for s in m.schedules
                    if s.is_active
                ],
            }
        )

    today_schedule = [
        {
            "time": r.scheduled_datetime.strftime("%H:%M"),
            "medicine": r.medicine.name if r.medicine else "Unknown",
            "status": r.status,
        }
        for r in today_records
    ]

    return {
        "user_name": user.name,
        "date": today.isoformat(),
        "medicines": meds,
        "today_schedule": today_schedule,
        "refill_summary": {
            "total_tracked": refill.get("total_tracked", 0),
            "low_stock_count": refill.get("low_stock_count", 0),
            "predictions": [
                {
                    "name": p["name"],
                    "stock_remaining": p["stock_remaining"],
                    "days_remaining": p["days_remaining"],
                    "status": p["status"],
                    "recommended_refill_date": p.get("recommended_refill_date"),
                }
                for p in refill.get("predictions", [])[:5]
            ],
            "alerts": [a["alert_message"] for a in refill.get("alerts", [])[:3]],
        },
    }


SYSTEM_PROMPT = (
    "You are the PillSync Medication Guide, a helpful assistant inside a medication "
    "tracking app. You answer questions about the user's own medication data provided "
    "below. Follow these rules:\n"
    "1. Answer ONLY from the provided context. If the data is missing, say so.\n"
    "2. Keep answers short (under 120 words) and use plain markdown with bullet lists.\n"
    "3. Never invent medicine names, dosages, or schedules.\n"
    "4. Remind users to consult a doctor or pharmacist for medical, side-effect, or "
    "interaction advice — do not give medical advice yourself.\n"
    "5. Use the user's first name naturally when greeting.\n"
    "Here is the user's current data as JSON:\n"
)

LIFESTYLE_SYSTEM_PROMPT = (
    "You are the PillSync Lifestyle Coach, a friendly wellness assistant inside a "
    "medication tracking app. Give practical, non-medical suggestions about hydration, "
    "sleep, activity, nutrition, and stress using the user's data below. Keep answers "
    "short (under 150 words) with plain markdown and bullet lists. Remind the user to "
    "ask a healthcare professional for personal medical guidance.\n"
    "Here is the user's current data as JSON:\n"
)

# Intent keywords that route a question to the lifestyle model.
LIFESTYLE_KEYWORDS = (
    "water", "hydrat", "sleep", "insomnia", "exercise", "workout", "activity",
    "diet", "nutrition", "food", "eat", "meal", "stress", "anxiety", "wellness",
    "weight", "steps", "walk", "caffeine", "screen time",
)


def _rule_based_reply(db: Session, user: User, medicines: list[Medicine], refill: dict, msg: str) -> str:
    """Local fallback used when the AI service is unavailable."""
    if any(k in msg for k in ("hello", "hi", "hey")):
        return (
            f"Hello {user.name.split()[0]}! I can help with your medication list, "
            "dosages, schedule, and refill status. What would you like to know?"
        )
    if any(k in msg for k in ("water", "sleep", "diet", "exercise", "stress")):
        return (
            "Here are a few general wellness basics: keep a water bottle handy and "
            "aim for steady hydration through the day, keep a consistent sleep "
            "schedule, and add short walks after meals. Talk to your clinician for "
            "advice tailored to your condition."
        )
    if "refill" in msg or "stock" in msg:
        if not refill["predictions"]:
            return "You don't have medicines with stock tracking yet. Add quantity when creating a medicine."
        lines = []
        for p in refill["predictions"][:5]:
            days = p["days_remaining"]
            days_txt = f"{days} days left" if days is not None else "no schedule"
            lines.append(f"• {p['name']}: {p['stock_remaining']} units ({days_txt}) — {p['status']}")
        alerts = refill["alerts"][:3]
        extra = ""
        if alerts:
            extra = "\n\nAlerts:\n" + "\n".join(f"• {a['alert_message']}" for a in alerts)
        return "Refill overview:\n" + "\n".join(lines) + extra
    if "schedule" in msg or "tomorrow" in msg or "when" in msg:
        if not medicines:
            return "No active medicines yet. Add medicines to see your schedule."
        lines = []
        for m in medicines:
            times = ", ".join(s.reminder_time.strftime("%H:%M") for s in m.schedules if s.is_active) or "no times"
            lines.append(f"• {m.name} {m.dosage}{m.dosage_unit}: {times}")
        return "Your active schedule:\n" + "\n".join(lines)
    if "dosage" in msg or "dose" in msg or "how much" in msg:
        if not medicines:
            return "You don't have medicines added yet."
        lines = [f"• {m.name}: {m.dosage}{m.dosage_unit} ({m.quantity_per_dose} per dose)" for m in medicines]
        return "Current dosages:\n" + "\n".join(lines) + "\n\nAlways follow your clinician's instructions."
    if "side effect" in msg or "interaction" in msg:
        return (
            "I can summarize your medication list, but I can't give medical advice about "
            "side effects or interactions. Please consult your doctor or pharmacist."
        )
    if "prescription" in msg or "explain" in msg or "list" in msg:
        if not medicines:
            return "No medicines on file. Use Medicines or Scanner to add some."
        lines = []
        for m in medicines:
            lines.append(
                f"• {m.name} {m.dosage}{m.dosage_unit} — {m.disease_category} — "
                f"{len([s for s in m.schedules if s.is_active])} reminder(s)"
            )
        return "Your medications:\n" + "\n".join(lines)
    return (
        "I can help with: your dosages, schedule, refill/stock status, and medicine list. "
        "Ask something like “What are my dosages?” or “Any refill alerts?”"
    )


def _suggested_follow_ups(reply: str, message: str) -> list[str]:
    """Derive a few contextual follow-up questions from the reply."""
    combined = f"{reply} {message}".lower()
    suggestions = []
    if "side effect" in combined or "interaction" in combined:
        suggestions.append("What are the side effects of my medications?")
        suggestions.append("Check my medicines for interactions")
    elif "dosage" in combined or "dose" in combined:
        suggestions.append("What are my current dosages?")
        suggestions.append("Explain my prescription")
    elif "refill" in combined or "stock" in combined:
        suggestions.append("Any refill alerts?")
        suggestions.append("Show my refill predictions")
    elif any(k in combined for k in ("water", "sleep", "diet", "exercise", "stress")):
        suggestions.append("Give me hydration tips")
        suggestions.append("Sleep recommendations for me")
    else:
        suggestions.append("Explain my prescription")
        suggestions.append("Medicine interactions")
        suggestions.append("My tomorrow schedule")
    return suggestions[:3]


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
    question = data.message.strip()
    refill = RefillPredictionEngine(db, user.id).summary()

    history = [m.model_dump() for m in data.history[-MAX_HISTORY_TURNS:]]
    is_lifestyle = any(keyword in msg for keyword in LIFESTYLE_KEYWORDS)
    prompt = LIFESTYLE_SYSTEM_PROMPT if is_lifestyle else SYSTEM_PROMPT
    context = _build_context(db, user, medicines, refill)

    reply = None
    try:
        reply = ai_service.assistant_chat(
            prompt + json.dumps(context, ensure_ascii=False),
            question,
            history=history,
            task=TASK_ASSISTANT,
        )
    except Exception as exc:  # never break the assistant
        logger.warning("Assistant AI call failed: %s", exc.__class__.__name__)

    engine = "rule-based"
    if reply:
        engine = model_for(TASK_ASSISTANT)
    else:
        reply = _rule_based_reply(db, user, medicines, refill, msg)

    return {
        "reply": reply,
        "disclaimer": MEDICAL_DISCLAIMER,
        "engine": engine,
        "suggestions": _suggested_follow_ups(reply, question),
    }


@router.post("/chat/stream")
async def chat_stream(
    data: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """SSE-streamed assistant reply (token by token) using the same context."""
    import json as _json
    from fastapi.responses import StreamingResponse
    from services.ai_config import AIRouter, AIRouterError

    medicines = (
        db.query(Medicine)
        .filter(Medicine.user_id == user.id, Medicine.is_active.is_(True))
        .all()
    )
    msg = data.message.strip().lower()
    question = data.message.strip()
    refill = RefillPredictionEngine(db, user.id).summary()

    history = [m.model_dump() for m in data.history[-MAX_HISTORY_TURNS:]]
    is_lifestyle = any(keyword in msg for keyword in LIFESTYLE_KEYWORDS)
    prompt = LIFESTYLE_SYSTEM_PROMPT if is_lifestyle else SYSTEM_PROMPT
    context = _build_context(db, user, medicines, refill)

    async def event_source():
        metadata = {
            "disclaimer": MEDICAL_DISCLAIMER,
            "engine": model_for(TASK_ASSISTANT),
        }
        yield f"data: {_json.dumps(metadata)}\n\n"
        try:
            router = AIRouter()
            collected = []
            for chunk in router.generate_stream(
                TASK_ASSISTANT,
                [
                    {"role": "system", "content": prompt + _json.dumps(context, ensure_ascii=False)},
                    *history,
                    {"role": "user", "content": question},
                ],
                max_tokens=700,
                temperature=0.3,
            ):
                collected.append(chunk)
                yield f"data: {_json.dumps({'delta': chunk})}\n\n"
            if not collected:
                fallback = _rule_based_reply(db, user, medicines, refill, msg)
                yield f"data: {_json.dumps({'delta': fallback, 'engine': 'rule-based'})}\n\n"
        except Exception:
            fallback = _rule_based_reply(db, user, medicines, refill, msg)
            yield f"data: {_json.dumps({'delta': fallback, 'engine': 'rule-based'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
