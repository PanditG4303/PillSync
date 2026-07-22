from datetime import datetime, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Medicine, MedicationSchedule, User
from auth import get_current_user

router = APIRouter(prefix="/medicines", tags=["Medicines"])


class ScheduleCreate(BaseModel):
    reminder_time: str
    days_of_week: Optional[str] = None


class MedicineCreate(BaseModel):
    name: str
    dosage: str = ""
    dosage_unit: str = ""
    medicine_type: str = ""
    instructions: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = True
    schedules: List[ScheduleCreate] = []


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    dosage_unit: Optional[str] = None
    medicine_type: Optional[str] = None
    instructions: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    schedules: Optional[List[ScheduleCreate]] = None


def parse_date(date_str: Optional[str]):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_time(time_str: str):
    try:
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    except (IndexError, ValueError):
        raise HTTPException(status_code=400, detail=f"Invalid time format: {time_str}")


def medicine_to_dict(med: Medicine):
    return {
        "id": med.id,
        "user_id": med.user_id,
        "name": med.name,
        "dosage": med.dosage,
        "dosage_unit": med.dosage_unit,
        "medicine_type": med.medicine_type,
        "instructions": med.instructions,
        "start_date": med.start_date.isoformat() if med.start_date else None,
        "end_date": med.end_date.isoformat() if med.end_date else None,
        "is_active": med.is_active,
        "created_at": med.created_at.isoformat() if med.created_at else None,
        "schedules": [
            {
                "id": s.id,
                "reminder_time": s.reminder_time.strftime("%H:%M"),
                "days_of_week": s.days_of_week,
                "is_active": s.is_active,
            }
            for s in med.schedules
        ],
    }


@router.get("")
def list_medicines(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    medicines = db.query(Medicine).filter(Medicine.user_id == user.id).order_by(Medicine.created_at.desc()).all()
    return [medicine_to_dict(m) for m in medicines]


@router.get("/{medicine_id}")
def get_medicine(medicine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.user_id == user.id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine_to_dict(medicine)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_medicine(data: MedicineCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Medicine name is required")

    medicine = Medicine(
        user_id=user.id,
        name=data.name.strip(),
        dosage=data.dosage,
        dosage_unit=data.dosage_unit,
        medicine_type=data.medicine_type,
        instructions=data.instructions,
        start_date=parse_date(data.start_date),
        end_date=parse_date(data.end_date),
        is_active=data.is_active,
    )
    db.add(medicine)
    db.commit()
    db.refresh(medicine)

    for sched in data.schedules:
        schedule = MedicationSchedule(
            medicine_id=medicine.id,
            reminder_time=parse_time(sched.reminder_time),
            days_of_week=sched.days_of_week,
        )
        db.add(schedule)

    db.commit()
    db.refresh(medicine)
    return medicine_to_dict(medicine)


@router.put("/{medicine_id}")
def update_medicine(medicine_id: int, data: MedicineUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.user_id == user.id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    if data.name is not None:
        if not data.name.strip():
            raise HTTPException(status_code=400, detail="Medicine name cannot be empty")
        medicine.name = data.name.strip()
    if data.dosage is not None:
        medicine.dosage = data.dosage
    if data.dosage_unit is not None:
        medicine.dosage_unit = data.dosage_unit
    if data.medicine_type is not None:
        medicine.medicine_type = data.medicine_type
    if data.instructions is not None:
        medicine.instructions = data.instructions
    if data.start_date is not None:
        medicine.start_date = parse_date(data.start_date)
    if data.end_date is not None:
        medicine.end_date = parse_date(data.end_date)
    if data.is_active is not None:
        medicine.is_active = data.is_active

    if data.schedules is not None:
        db.query(MedicationSchedule).filter(MedicationSchedule.medicine_id == medicine.id).delete()
        for sched in data.schedules:
            schedule = MedicationSchedule(
                medicine_id=medicine.id,
                reminder_time=parse_time(sched.reminder_time),
                days_of_week=sched.days_of_week,
            )
            db.add(schedule)

    db.commit()
    db.refresh(medicine)
    return medicine_to_dict(medicine)


@router.delete("/{medicine_id}")
def delete_medicine(medicine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.user_id == user.id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    db.delete(medicine)
    db.commit()
    return {"message": "Medicine deleted successfully"}


@router.patch("/{medicine_id}/toggle")
def toggle_medicine(medicine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.user_id == user.id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    medicine.is_active = not medicine.is_active
    db.commit()
    return medicine_to_dict(medicine)
