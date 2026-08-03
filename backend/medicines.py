from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.constants import DISEASE_CATEGORIES
from core.security import get_current_user, resolve_target_user_id
from database import get_db
from models import Medicine, MedicationSchedule, User
from services.medicines import MedicineSerializer

router = APIRouter(prefix="/medicines", tags=["Medicines"])


class ScheduleCreate(BaseModel):
    reminder_time: str
    days_of_week: Optional[str] = None


class MedicineCreate(BaseModel):
    name: str = Field(..., min_length=1)
    dosage: str = ""
    dosage_unit: str = ""
    medicine_type: str = ""
    disease_category: str = "General"
    instructions: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = True
    quantity_total: float = 0
    stock_remaining: Optional[float] = None
    quantity_per_dose: float = 1
    low_stock_threshold_days: int = 5
    schedules: List[ScheduleCreate] = []


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    dosage_unit: Optional[str] = None
    medicine_type: Optional[str] = None
    disease_category: Optional[str] = None
    instructions: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    quantity_total: Optional[float] = None
    stock_remaining: Optional[float] = None
    quantity_per_dose: Optional[float] = None
    low_stock_threshold_days: Optional[int] = None
    schedules: Optional[List[ScheduleCreate]] = None


def _get_user_medicine(db: Session, medicine_id: int, user: User, patient_id: Optional[int] = None) -> Medicine:
    target_id = resolve_target_user_id(db, user, patient_id)
    medicine = (
        db.query(Medicine)
        .filter(Medicine.id == medicine_id, Medicine.user_id == target_id)
        .first()
    )
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


def _normalize_category(category: str | None) -> str:
    if not category:
        return "General"
    if category in DISEASE_CATEGORIES:
        return category
    return "Other"


@router.get("")
def list_medicines(
    category: Optional[str] = Query(None),
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    query = db.query(Medicine).filter(Medicine.user_id == target_id)
    if category:
        query = query.filter(Medicine.disease_category == category)
    medicines = query.order_by(Medicine.created_at.desc()).all()
    return [MedicineSerializer.to_dict(m) for m in medicines]


@router.get("/{medicine_id}")
def get_medicine(
    medicine_id: int,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return MedicineSerializer.to_dict(_get_user_medicine(db, medicine_id, user, patient_id))



@router.post("", status_code=status.HTTP_201_CREATED)
def create_medicine(
    data: MedicineCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Medicine name is required")

    qty_total = max(float(data.quantity_total or 0), 0)
    stock = data.stock_remaining if data.stock_remaining is not None else qty_total

    medicine = Medicine(
        user_id=user.id,
        name=data.name.strip(),
        dosage=data.dosage,
        dosage_unit=data.dosage_unit,
        medicine_type=data.medicine_type,
        disease_category=_normalize_category(data.disease_category),
        instructions=data.instructions,
        start_date=MedicineSerializer.parse_optional_date(data.start_date),
        end_date=MedicineSerializer.parse_optional_date(data.end_date),
        is_active=data.is_active,
        quantity_total=qty_total,
        stock_remaining=max(float(stock or 0), 0),
        quantity_per_dose=max(float(data.quantity_per_dose or 1), 0.1),
        low_stock_threshold_days=max(int(data.low_stock_threshold_days or 5), 1),
    )
    db.add(medicine)
    db.commit()
    db.refresh(medicine)

    for sched in data.schedules:
        db.add(MedicineSerializer.build_schedule(medicine.id, sched.reminder_time, sched.days_of_week))

    db.commit()
    db.refresh(medicine)
    return MedicineSerializer.to_dict(medicine)


@router.put("/{medicine_id}")
def update_medicine(
    medicine_id: int,
    data: MedicineUpdate,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    medicine = _get_user_medicine(db, medicine_id, user, patient_id)
    updates = data.model_dump(exclude_unset=True)

    if "name" in updates:
        name = (updates["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Medicine name cannot be empty")
        medicine.name = name
    if "dosage" in updates:
        medicine.dosage = updates["dosage"]
    if "dosage_unit" in updates:
        medicine.dosage_unit = updates["dosage_unit"]
    if "medicine_type" in updates:
        medicine.medicine_type = updates["medicine_type"]
    if "disease_category" in updates:
        medicine.disease_category = _normalize_category(updates["disease_category"])
    if "instructions" in updates:
        medicine.instructions = updates["instructions"]
    if "start_date" in updates:
        medicine.start_date = MedicineSerializer.parse_optional_date(updates["start_date"])
    if "end_date" in updates:
        medicine.end_date = MedicineSerializer.parse_optional_date(updates["end_date"])
    if "is_active" in updates:
        medicine.is_active = updates["is_active"]
    if "quantity_total" in updates and updates["quantity_total"] is not None:
        medicine.quantity_total = max(float(updates["quantity_total"]), 0)
    if "stock_remaining" in updates and updates["stock_remaining"] is not None:
        medicine.stock_remaining = max(float(updates["stock_remaining"]), 0)
    if "quantity_per_dose" in updates and updates["quantity_per_dose"] is not None:
        medicine.quantity_per_dose = max(float(updates["quantity_per_dose"]), 0.1)
    if "low_stock_threshold_days" in updates and updates["low_stock_threshold_days"] is not None:
        medicine.low_stock_threshold_days = max(int(updates["low_stock_threshold_days"]), 1)

    if "schedules" in updates and updates["schedules"] is not None:
        db.query(MedicationSchedule).filter(MedicationSchedule.medicine_id == medicine.id).delete()
        for sched in updates["schedules"]:
            db.add(
                MedicineSerializer.build_schedule(
                    medicine.id,
                    sched["reminder_time"],
                    sched.get("days_of_week"),
                )
            )

    db.commit()
    db.refresh(medicine)
    return MedicineSerializer.to_dict(medicine)


@router.delete("/{medicine_id}")
def delete_medicine(
    medicine_id: int,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    medicine = _get_user_medicine(db, medicine_id, user, patient_id)
    db.delete(medicine)
    db.commit()
    return {"message": "Medicine deleted successfully"}


@router.patch("/{medicine_id}/toggle")
def toggle_medicine(
    medicine_id: int,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    medicine = _get_user_medicine(db, medicine_id, user, patient_id)
    medicine.is_active = not medicine.is_active
    db.commit()
    db.refresh(medicine)
    return MedicineSerializer.to_dict(medicine)

