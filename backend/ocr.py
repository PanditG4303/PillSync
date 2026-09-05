"""OCR prescription scan endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.constants import DISEASE_CATEGORIES, IS_PRODUCTION
from core.rate_limit import client_key, limiter
from core.security import get_current_user
from database import get_db
from models import Medicine, User, UserPreference
from services.medicines import MedicineSerializer
from services.ocr import OCRService, PrescriptionParser
from services.validation import find_existing, find_similar, normalize_name, suggest_correction

router = APIRouter(prefix="/ocr", tags=["OCR"])


def ai_service_lazy():
    """Lazy import so the OCR router never hard-depends on the AI service."""
    from services.ai_service import ai_service

    return ai_service


def _safe_extract_json(content: str) -> str:
    """Pull the first JSON object out of a model response (lenient)."""
    import re as _re

    text = content.strip()
    if text.startswith("```"):
        text = _re.sub(r"^```(?:json)?\s*", "", text)
        text = _re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")
    return text[start : end + 1]

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


class ScheduleIn(BaseModel):
    reminder_time: str
    days_of_week: Optional[str] = None


class ExtractedMedicineIn(BaseModel):
    name: str = Field(..., min_length=1)
    dosage: str = ""
    dosage_unit: str = ""
    medicine_type: str = "Tablet"
    disease_category: str = "General"
    instructions: str = ""
    duration: str = ""
    doctor_notes: str = ""
    batch_number: str = ""
    expiry_date: str = ""
    prescription_date: str = ""
    reason: str = ""
    quantity: float = 30
    quantity_per_dose: float = 1
    confidence: float = 0.8
    schedules: List[ScheduleIn] = []
    merge_into_id: Optional[int] = None


class SaveExtractedRequest(BaseModel):
    medicines: List[ExtractedMedicineIn]


class ParseTextRequest(BaseModel):
    text: str = Field(..., min_length=3)


def _resolve_times_source(db: Session, user_id: int) -> str:
    """Preference: 'system' fills default slots, 'user' leaves times for the user."""
    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if pref and pref.ocr_default_times_source == "user":
        return "user"
    return "system"


def _apply_times_source(db: Session, user_id: int, medicines: list) -> None:
    """Strip suggested default slots from parsed medicines when the user prefers to."""
    if _resolve_times_source(db, user_id) != "user":
        return
    for med in medicines:
        med["times"] = []
        med["schedules"] = []


def _attach_matches(medicines: list, db: Session, user_id: int) -> list:
    """Annotate each extracted medicine with likely matches from the user's list."""
    for med in medicines:
        name = med.get("name") or ""
        med["normalized_name"] = normalize_name(name) or name
        existing = find_existing(db, user_id, name, dosage=med.get("dosage"), dosage_unit=med.get("dosage_unit"))
        similar = find_similar(db, user_id, name, limit=3)
        med["matches"] = [
            {
                "id": existing.id,
                "name": existing.name,
                "dosage": existing.dosage,
                "dosage_unit": existing.dosage_unit,
                "match_type": "exact",
            }
        ] if existing else similar
        med["match_required"] = bool(existing)
    return medicines


def _apply_merged_schedules(db: Session, medicine: Medicine, times: list[str]) -> None:
    """Add schedule times that are not already configured (no duplicates)."""
    existing_times = {s.reminder_time.strftime("%H:%M") for s in medicine.schedules}
    for t in times:
        if t not in existing_times:
            db.add(MedicineSerializer.build_schedule(medicine.id, t, None))


@router.post("/scan")
async def scan_prescription(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    limiter.check(client_key(request, "ocr-scan"), limit=10, window_seconds=60)

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_TYPES and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a PNG or JPG photo.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 8MB)")

    filename = file.filename or "prescription.jpg"
    result = await OCRService().scan(data, filename, _resolve_times_source(db, user.id))
    if result.get("medicines"):
        _attach_matches(result["medicines"], db, user.id)
    result["user_id"] = user.id
    return result


@router.post("/parse-text")
def parse_prescription_text(
    payload: ParseTextRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    limiter.check(client_key(request, "ocr-text"), limit=20, window_seconds=60)
    medicines = PrescriptionParser().parse(payload.text)
    if medicines:
        _apply_times_source(db, user.id, medicines)
        _attach_matches(medicines, db, user.id)
    return {
        "engine": "text-parser",
        "raw_text": payload.text.strip(),
        "medicines": medicines,
        "count": len(medicines),
        "categories": list(DISEASE_CATEGORIES),
        "warning": None,
        "message": (
            f"Detected {len(medicines)} medicine(s)"
            if medicines
            else "No medicines detected in the provided text."
        ),
        "user_id": user.id,
    }


class ValidateNameRequest(BaseModel):
    name: str = Field(..., min_length=1)
    dosage: str = ""
    dosage_unit: str = ""
    confidence: float = Field(0.5, ge=0, le=1)


@router.post("/validate")
def validate_medicine_name(
    payload: ValidateNameRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Validate an OCR-extracted medicine name: fuzzy match + AI inference.

    Pipeline:
      1. Canonical/alias normalization (brand -> generic, spelling fixes).
      2. Fuzzy match against the user's existing medicines (duplicates).
      3. If the name is still unknown (no alias, no user match), ask the
         assistant model to infer the closest real medicine.
    Returns a confidence score and highlight-able "uncertain" flag.
    """
    limiter.check(client_key(request, "ocr-validate"), limit=40, window_seconds=60)

    name = payload.name.strip()
    normalized = normalize_name(name) or name
    existing = find_existing(db, user.id, name, dosage=payload.dosage, dosage_unit=payload.dosage_unit)
    similar = find_similar(db, user.id, name, limit=3)
    correction = suggest_correction(name)

    source = "unchanged"
    ai_inference = None
    if correction and correction.lower() != name.lower():
        source = "alias"
        confidence = max(payload.confidence, 0.9)
    elif existing:
        source = "user-match"
        confidence = max(payload.confidence, 0.95)
    elif similar:
        source = "fuzzy"
        confidence = max(payload.confidence, similar[0].get("similarity", 0.7))
    else:
        # Unknown medicine — ask Nemotron to infer the closest real medicine.
        try:
            from services.ai_config import TASK_ASSISTANT, model_for

            inferred = ai_service_lazy().assistant_chat(
                "You are a medication catalog lookup. Given a possibly misspelled or "
                "garbled medicine name from an OCR scan, return the closest real "
                "generic medicine name. Reply with VALID JSON ONLY: "
                '{"name": "correct name or null", "reason": "one short sentence"}. '
                "If nothing resembles a real medicine, return null.",
                payload.name,
                task=TASK_ASSISTANT,
            )
            if inferred:
                parsed = json.loads(_safe_extract_json(inferred))
                candidate = str(parsed.get("name") or "").strip()
                if candidate:
                    ai_inference = {
                        "name": candidate,
                        "reason": str(parsed.get("reason") or "Closest match in medicine catalog"),
                    }
                    source = "ai"
                    confidence = max(payload.confidence, 0.8)
        except Exception as exc:  # AI is optional — keep the pipeline working
            logger.info("AI medicine inference unavailable: %s", exc.__class__.__name__)
            confidence = payload.confidence

    return {
        "original": name,
        "normalized_name": normalized,
        "corrected_name": (correction if source in ("alias", "ai") else (normalized if normalized != name else name)),
        "confidence": round(min(max(confidence, 0), 1), 2),
        "uncertain": confidence < 0.75,
        "source": source,
        "ai_inference": ai_inference,
        "duplicate": (
            {
                "id": existing.id,
                "name": existing.name,
                "dosage": existing.dosage,
                "dosage_unit": existing.dosage_unit,
            }
            if existing
            else None
        ),
        "similar": similar,
    }


@router.post("/save")
def save_extracted_medicines(
    payload: SaveExtractedRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.medicines:
        raise HTTPException(status_code=400, detail="No medicines to save")

    created = []
    merged = []
    try:
        for item in payload.medicines:
            name = item.name.strip()
            qty = max(float(item.quantity or 0), 0)

            if item.merge_into_id:
                existing = (
                    db.query(Medicine)
                    .filter(Medicine.id == item.merge_into_id, Medicine.user_id == user.id)
                    .first()
                )
                if not existing:
                    raise HTTPException(status_code=404, detail="Medicine to merge into not found")

                if qty > 0:
                    existing.stock_remaining = (existing.stock_remaining or 0) + qty
                    existing.quantity_total = (existing.quantity_total or 0) + qty
                if not existing.instructions and item.instructions:
                    existing.instructions = item.instructions
                if item.duration and not getattr(existing, "duration", None):
                    existing.duration = item.duration
                if item.doctor_notes and not getattr(existing, "doctor_notes", None):
                    existing.doctor_notes = item.doctor_notes
                if item.batch_number and not getattr(existing, "batch_number", None):
                    existing.batch_number = item.batch_number
                if item.expiry_date and not getattr(existing, "expiry_date", None):
                    existing.expiry_date = item.expiry_date
                if item.prescription_date and not getattr(existing, "prescription_date", None):
                    existing.prescription_date = item.prescription_date
                times = [s.reminder_time for s in item.schedules if s.reminder_time]
                _apply_merged_schedules(db, existing, times)
                merged.append(existing)
                continue

            medicine = Medicine(
                user_id=user.id,
                name=name,
                dosage=item.dosage,
                dosage_unit=item.dosage_unit,
                medicine_type=item.medicine_type or "Tablet",
                disease_category=item.disease_category or "General",
                instructions=item.instructions,
                duration=item.duration or "",
                doctor_notes=item.doctor_notes or "",
                batch_number=item.batch_number or "",
                expiry_date=item.expiry_date or "",
                prescription_date=item.prescription_date or "",
                is_active=True,
                quantity_total=qty,
                stock_remaining=qty,
                quantity_per_dose=max(float(item.quantity_per_dose or 1), 0.1),
            )
            db.add(medicine)
            db.flush()

            schedules = item.schedules or [ScheduleIn(reminder_time="08:00")]
            for sched in schedules:
                db.add(
                    MedicineSerializer.build_schedule(
                        medicine.id,
                        sched.reminder_time,
                        sched.days_of_week,
                    )
                )
            created.append(medicine)

        db.commit()
        for medicine in created + merged:
            db.refresh(medicine)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    if merged:
        message = f"Saved {len(created)} medicine(s), merged {len(merged)} existing medicine(s)"
    else:
        message = f"Saved {len(created)} medicine(s)"

    return {
        "message": message,
        "medicines": [MedicineSerializer.to_dict(m) for m in created],
        "merged": [MedicineSerializer.to_dict(m) for m in merged],
        "count": len(created),
        "user_id": user.id,
    }


TEST_SAMPLE_PRESCRIPTION = (
    "RX Prescription\n"
    "Patient: John Smith\n"
    "Prescription date: 2026-07-01\n"
    "Batch #8823\n"
    "\n"
    "1. Metformin 500mg - Take twice daily - Qty 60 - after meals\n"
    "2. Amlodipine 5mg - Take once daily - Qty 30 - BP control\n"
    "3. Amoxicillin 250mg - Three times daily - Qty 21 - for 7 days\n"
    "Notes: come back in 2 weeks\n"
)


@router.post("/test-parse")
def test_parse_prescription(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dev-only endpoint: run the text parser against a known sample prescription."""
    if IS_PRODUCTION:
        raise HTTPException(status_code=404, detail="Not found")

    limiter.check(client_key(request, "ocr-test"), limit=10, window_seconds=60)
    medicines = PrescriptionParser().parse(TEST_SAMPLE_PRESCRIPTION)
    if medicines:
        _apply_times_source(db, user.id, medicines)
        _attach_matches(medicines, db, user.id)
    return {
        "engine": "text-parser",
        "raw_text": TEST_SAMPLE_PRESCRIPTION,
        "medicines": medicines,
        "count": len(medicines),
        "categories": list(DISEASE_CATEGORIES),
        "warning": None,
        "message": (
            f"Detected {len(medicines)} medicine(s) from the sample prescription"
            if medicines
            else "No medicines detected in the sample text."
        ),
        "user_id": user.id,
    }
