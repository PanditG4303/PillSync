"""Admin management endpoints for system oversight and role control."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from core.constants import ROLE_ADMIN, VALID_ROLES
from core.security import require_roles
from database import get_db
from models import CaregiverAssignment, Medicine, MedicationHistory, User
from services.refill import RefillPredictionEngine

router = APIRouter(prefix="/admin", tags=["Admin"])


class UpdateRoleRequest(BaseModel):
    role: str


class AdminAssignRequest(BaseModel):
    caregiver_id: int
    patient_id: int


def _user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role or "Patient",
        "is_active": u.is_active,
    }


@router.get("/overview")
def get_admin_overview(
    admin: User = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    total_users = db.query(User).count()
    total_patients = db.query(User).filter(User.role == "Patient").count()
    total_caregivers = db.query(User).filter(User.role == "Caregiver").count()
    total_admins = db.query(User).filter(User.role == "Admin").count()
    total_medicines = db.query(Medicine).filter(Medicine.is_active.is_(True)).count()
    total_history = db.query(MedicationHistory).count()
    total_assignments = db.query(CaregiverAssignment).count()

    return {
        "users": {
            "total": total_users,
            "patients": total_patients,
            "caregivers": total_caregivers,
            "admins": total_admins,
        },
        "platform": {
            "active_medicines": total_medicines,
            "medication_logs": total_history,
            "caregiver_assignments": total_assignments,
        },
    }


@router.get("/users")
def list_users(
    role: Optional[str] = Query(None),
    admin: User = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role and role in VALID_ROLES:
        query = query.filter(User.role == role)
    users = query.order_by(User.id.asc()).all()
    return {"users": [_user_dict(u) for u in users]}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UpdateRoleRequest,
    admin: User = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    new_role = payload.role.strip().title()
    if new_role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Valid options: {', '.join(VALID_ROLES)}",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = new_role
    db.commit()
    db.refresh(user)
    return {"message": "User role updated successfully", "user": _user_dict(user)}


@router.get("/assignments")
def list_all_assignments(
    admin: User = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    assignments = db.query(CaregiverAssignment).all()
    result = []
    for a in assignments:
        cg = db.query(User).filter(User.id == a.caregiver_id).first()
        pt = db.query(User).filter(User.id == a.patient_id).first()
        result.append({
            "id": a.id,
            "caregiver": _user_dict(cg) if cg else None,
            "patient": _user_dict(pt) if pt else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return {"assignments": result}


@router.post("/assignments")
def create_assignment(
    payload: AdminAssignRequest,
    admin: User = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    cg = db.query(User).filter(User.id == payload.caregiver_id).first()
    pt = db.query(User).filter(User.id == payload.patient_id).first()

    if not cg:
        raise HTTPException(status_code=404, detail="Caregiver not found")
    if not pt:
        raise HTTPException(status_code=404, detail="Patient not found")
    if cg.id == pt.id:
        raise HTTPException(status_code=400, detail="Cannot assign user to themselves")

    existing = (
        db.query(CaregiverAssignment)
        .filter(
            CaregiverAssignment.caregiver_id == cg.id,
            CaregiverAssignment.patient_id == pt.id,
        )
        .first()
    )
    if existing:
        return {"message": "Assignment already exists", "assignment_id": existing.id}

    assignment = CaregiverAssignment(caregiver_id=cg.id, patient_id=pt.id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"message": "Assignment created successfully", "assignment_id": assignment.id}


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    admin: User = Depends(require_roles(ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    assignment = db.query(CaregiverAssignment).filter(CaregiverAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment removed successfully"}
