"""OCR prescription scan endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.constants import DISEASE_CATEGORIES
from core.rate_limit import client_key, limiter
from core.security import get_current_user
from database import get_db
from models import Medicine, User
from services.medicines import MedicineSerializer
from services.ocr import OCRService, PrescriptionParser

router = APIRouter(prefix="/ocr", tags=["OCR"])

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
    quantity: float = 30
    quantity_per_dose: float = 1
    schedules: List[ScheduleIn] = []


class SaveExtractedRequest(BaseModel):
    medicines: List[ExtractedMedicineIn]


class ParseTextRequest(BaseModel):
    text: str = Field(..., min_length=3)


@router.post("/scan")
async def scan_prescription(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
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
    result = await OCRService().scan(data, filename)
    result["user_id"] = user.id
    return result


@router.post("/parse-text")
def parse_prescription_text(
    payload: ParseTextRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    limiter.check(client_key(request, "ocr-text"), limit=20, window_seconds=60)
    medicines = PrescriptionParser().parse(payload.text)
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


@router.post("/save")
def save_extracted_medicines(
    payload: SaveExtractedRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.medicines:
        raise HTTPException(status_code=400, detail="No medicines to save")

    created = []
    try:
        for item in payload.medicines:
            qty = max(float(item.quantity or 0), 0)
            medicine = Medicine(
                user_id=user.id,
                name=item.name.strip(),
                dosage=item.dosage,
                dosage_unit=item.dosage_unit,
                medicine_type=item.medicine_type or "Tablet",
                disease_category=item.disease_category or "General",
                instructions=item.instructions,
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
        for medicine in created:
            db.refresh(medicine)
    except Exception:
        db.rollback()
        raise

    return {
        "message": f"Saved {len(created)} medicine(s)",
        "medicines": [MedicineSerializer.to_dict(m) for m in created],
    }
