"""Refill prediction and stock management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.constants import DISEASE_CATEGORIES
from core.security import get_current_user, resolve_target_user_id
from database import get_db
from models import Medicine, User
from services.medicines import MedicineSerializer
from services.refill import RefillPredictionEngine

router = APIRouter(prefix="/refills", tags=["Refills"])


class StockUpdate(BaseModel):
    stock_remaining: Optional[float] = Field(default=None, ge=0)
    quantity_total: Optional[float] = Field(default=None, ge=0)
    quantity_per_dose: Optional[float] = Field(default=None, gt=0)
    low_stock_threshold_days: Optional[int] = Field(default=None, ge=1, le=60)


@router.get("/predictions")
def get_predictions(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    return RefillPredictionEngine(db, target_id).summary()


@router.get("/categories")
def list_categories(user: User = Depends(get_current_user)):
    return {"categories": list(DISEASE_CATEGORIES)}


@router.get("/by-category")
def medicines_by_category(
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    medicines = (
        db.query(Medicine)
        .filter(Medicine.user_id == target_id, Medicine.is_active.is_(True))
        .order_by(Medicine.disease_category.asc(), Medicine.name.asc())
        .all()
    )
    grouped: dict[str, list] = {}
    for med in medicines:
        cat = med.disease_category or "General"
        grouped.setdefault(cat, []).append(MedicineSerializer.to_dict(med))
    return {"groups": grouped, "categories": list(DISEASE_CATEGORIES)}


@router.patch("/{medicine_id}/stock")
def update_stock(
    medicine_id: int,
    data: StockUpdate,
    patient_id: Optional[int] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = resolve_target_user_id(db, user, patient_id)
    medicine = (
        db.query(Medicine)
        .filter(Medicine.id == medicine_id, Medicine.user_id == target_id)
        .first()
    )
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    engine = RefillPredictionEngine(db, target_id)
    prediction = engine.update_stock(
        medicine,
        stock_remaining=data.stock_remaining,
        quantity_total=data.quantity_total,
        quantity_per_dose=data.quantity_per_dose,
        low_stock_threshold_days=data.low_stock_threshold_days,
    )
    return {
        "medicine": MedicineSerializer.to_dict(medicine),
        "refill": prediction,
    }

