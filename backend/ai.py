"""AI-powered features: drug interaction checker and lifestyle coach.

Both endpoints use the central AI service and degrade gracefully to local
rule-based answers when the AI provider is unavailable or unconfigured.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security import get_current_user
from core.time_utils import day_bounds, today_local
from database import get_db
from models import MedicationHistory, Medicine, User
from services.adherence import AdherenceCalculator
from services.ai_service import LIFESTYLE_DISCLAIMER, MEDICAL_DISCLAIMER, ai_service
from services.ai_config import is_configured
from services.refill import RefillPredictionEngine

logger = logging.getLogger("pillsync-ai")

router = APIRouter(prefix="/ai", tags=["AI Features"])

VALID_SEVERITIES = ("Low", "Medium", "High")


class InteractionCheckRequest(BaseModel):
    medicine_ids: List[int] = Field(..., min_length=1, max_length=10)


class LifestyleRequest(BaseModel):
    topic: str = Field("general", min_length=1, max_length=40)


# ----------------------------------------------------------------------
# Rule-based fallbacks (used when AI is not configured/unavailable)
# ----------------------------------------------------------------------

# A small, well-known interactions knowledge base for the local fallback.
KNOWN_INTERACTIONS = [
    {
        "medicines": ["Warfarin", "Aspirin"],
        "severity": "High",
        "description": "Both affect blood clotting and can raise bleeding risk when combined.",
        "precaution": "Tell your doctor before taking them together; monitor for unusual bleeding or bruising.",
    },
    {
        "medicines": ["Aspirin", "Ibuprofen"],
        "severity": "Medium",
        "description": "Combining them may increase stomach irritation and bleeding risk.",
        "precaution": "Avoid taking them at the same time; ask a pharmacist before alternating.",
    },
    {
        "medicines": ["Ibuprofen", "Warfarin"],
        "severity": "High",
        "description": "NSAIDs can increase the blood-thinning effect of warfarin.",
        "precaution": "Avoid this combination unless approved by your doctor.",
    },
    {
        "medicines": ["Warfarin", "Amoxicillin"],
        "severity": "Medium",
        "description": "Some antibiotics can alter warfarin's effect on clotting.",
        "precaution": "Get INR checked more often while on both medicines.",
    },
    {
        "medicines": ["Metformin", "Alcohol"],
        "severity": "Medium",
        "description": "Alcohol can raise the risk of lactic acidosis with metformin.",
        "precaution": "Limit alcohol and talk to your doctor about safe amounts.",
    },
    {
        "medicines": ["Lisinopril", "Potassium"],
        "severity": "Medium",
        "description": "ACE inhibitors can raise potassium levels, especially with potassium supplements.",
        "precaution": "Have potassium levels checked and avoid extra potassium supplements.",
    },
]


def _fallback_interactions(names: list[str]) -> dict:
    """Local interaction analysis used when AI is unavailable."""
    interactions = []
    for known in KNOWN_INTERACTIONS:
        a, b = known["medicines"]
        has_a = any(a.lower() in n.lower() for n in names)
        has_b = any(b.lower() in n.lower() for n in names)
        if has_a and has_b:
            interactions.append(known)
    notes = []
    if not interactions:
        notes.append(
            "No known interactions were found in the built-in reference list. "
            "This is not a guarantee — always check with a pharmacist."
        )
    return {
        "interactions": interactions,
        "notes": notes,
        "source": "rule-based",
    }


def _normalize_interactions(data: dict) -> dict:
    """Sanitize AI output into the stable response shape."""
    raw = data.get("interactions") if isinstance(data, dict) else None
    interactions = []
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            meds = [str(m).strip() for m in item.get("medicines") if isinstance(item.get("medicines"), list)]
            if len(meds) < 2:
                continue
            severity = str(item.get("severity") or "Medium").strip().title()
            if severity not in VALID_SEVERITIES:
                severity = "Medium"
            interactions.append(
                {
                    "medicines": meds[:2],
                    "severity": severity,
                    "description": str(item.get("description") or "").strip(),
                    "precaution": str(item.get("precaution") or "").strip(),
                }
            )
    notes = []
    raw_notes = data.get("notes") if isinstance(data, dict) else None
    if isinstance(raw_notes, list):
        notes = [str(n).strip() for n in raw_notes if str(n).strip()]
    return {
        "interactions": interactions,
        "notes": notes,
        "source": "ai",
    }


def _fallback_lifestyle(topic: str, user_name: str) -> str:
    """Local wellness advice used when AI is unavailable."""
    first = (user_name or "there").split()[0]
    tips = {
        "hydration": (
            f"Hi {first}! Aim for roughly 6–8 glasses of water a day and more on hot "
            "days or when active. Keep a bottle nearby and sip steadily rather than "
            "drinking large amounts at once."
        ),
        "sleep": (
            f"Hi {first}! Try a consistent sleep schedule, wind down without screens "
            "30 minutes before bed, and keep your bedroom cool and dark. Short naps "
            "are fine, but avoid long daytime sleeping."
        ),
        "activity": (
            f"Hi {first}! Even light activity like a 15–20 minute walk after meals "
            "helps. Start small, keep a regular rhythm, and check with your clinician "
            "before starting anything strenuous."
        ),
        "nutrition": (
            f"Hi {first}! Aim for balanced plates with vegetables, protein, and whole "
            "grains. Eat at consistent times, and drink water with meals instead of "
            "sugary drinks."
        ),
        "stress": (
            f"Hi {first}! Simple stress helpers: slow breathing for a few minutes, "
            "short breaks from screens, and gentle movement. If stress feels "
            "overwhelming, talk to a professional."
        ),
    }
    return tips.get(topic, tips["nutrition"])


LIFESTYLE_TOPICS = (
    "general",
    "hydration",
    "sleep",
    "activity",
    "nutrition",
    "stress",
)


@router.post("/interactions")
def check_interactions(
    payload: InteractionCheckRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    medicines = (
        db.query(Medicine)
        .filter(Medicine.user_id == user.id, Medicine.id.in_(payload.medicine_ids))
        .all()
    )
    if not medicines:
        raise HTTPException(status_code=404, detail="No matching medicines found")

    names = [m.name for m in medicines]
    result = ai_service.check_interactions(names)
    if result is None:
        result = _fallback_interactions(names)
    else:
        result = _normalize_interactions(result)
        if not result["interactions"] and not result["notes"]:
            result = _fallback_interactions(names)

    return {
        "medicines": [
            {"id": m.id, "name": m.name, "dosage": f"{m.dosage}{m.dosage_unit}".strip()}
            for m in medicines
        ],
        **result,
        "ai_configured": is_configured(),
        "disclaimer": MEDICAL_DISCLAIMER,
    }


@router.post("/lifestyle")
def lifestyle_advice(
    payload: LifestyleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    topic = payload.topic.strip().lower()
    if topic not in LIFESTYLE_TOPICS:
        topic = "general"

    today = today_local()
    day_start, day_end = day_bounds(today)
    records = (
        db.query(MedicationHistory)
        .filter(
            MedicationHistory.user_id == user.id,
            MedicationHistory.scheduled_datetime >= day_start,
            MedicationHistory.scheduled_datetime <= day_end,
        )
        .all()
    )
    medicines = (
        db.query(Medicine)
        .filter(Medicine.user_id == user.id, Medicine.is_active.is_(True))
        .all()
    )
    stats = AdherenceCalculator.compute_stats(records)
    refill = RefillPredictionEngine(db, user.id).summary()

    context = {
        "user_name": user.name,
        "topic": topic,
        "active_medicines": [
            {"name": m.name, "dosage": f"{m.dosage}{m.dosage_unit}".strip(), "category": m.disease_category}
            for m in medicines
        ],
        "today_stats": stats,
        "low_stock_count": refill.get("low_stock_count", 0),
    }

    prompt = (
        "You are the PillSync Lifestyle Coach. Give practical, friendly, non-medical "
        f"suggestions about \"{topic}\" (hydration, sleep, activity, nutrition, stress, "
        "or general wellness) tailored to the user data below. Use plain markdown with "
        "short bullet lists, under 180 words. Remind the user to consult a healthcare "
        "professional for personal medical guidance.\n"
        "User data:\n"
    )
    import json

    advice = ai_service.lifestyle_advice(prompt + json.dumps(context, ensure_ascii=False))
    engine = "ai"
    if not advice:
        advice = _fallback_lifestyle(topic, user.name)
        engine = "rule-based"

    return {
        "topic": topic,
        "advice": advice,
        "engine": engine,
        "ai_configured": is_configured(),
        "disclaimer": LIFESTYLE_DISCLAIMER,
    }
