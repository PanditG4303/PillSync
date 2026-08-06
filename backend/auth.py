from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from core.constants import (
    DEFAULT_ROLE,
    MIN_PASSWORD_LENGTH,
    ROLE_ADMIN,
    ROLE_CAREGIVER,
    ROLE_PATIENT,
    VALID_ROLES,
    generate_reset_token,
)
from core.rate_limit import client_key, limiter
from core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    require_roles,
    validate_password_strength,
    verify_password,
)
from database import get_db
from models import CaregiverAssignment, PasswordResetToken, User

router = APIRouter(prefix="/auth", tags=["Authentication"])

RESET_TOKEN_HOURS = 1


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=MIN_PASSWORD_LENGTH)
    confirm_password: str
    role: str = DEFAULT_ROLE


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=MIN_PASSWORD_LENGTH)


class CaregiverAssignRequest(BaseModel):
    patient_email: EmailStr


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_role(role: str | None) -> str:
    if not role:
        return DEFAULT_ROLE
    cleaned = role.strip().title()
    # Prevent self-signup as Admin
    if cleaned == ROLE_ADMIN:
        return DEFAULT_ROLE
    if cleaned in VALID_ROLES:
        return cleaned
    return DEFAULT_ROLE


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": getattr(user, "role", None) or DEFAULT_ROLE,
    }


def _auth_response(user: User, message: str) -> dict:
    role = getattr(user, "role", None) or DEFAULT_ROLE
    return {
        "message": message,
        "access_token": create_access_token(user.id, user.email, role),
        "token_type": "bearer",
        "user": _user_payload(user),
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, req: Request, db: Session = Depends(get_db)):
    limiter.check(client_key(req, "register"), limit=10, window_seconds=60)

    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    strength = validate_password_strength(request.password)
    if strength:
        raise HTTPException(status_code=400, detail=strength)

    email = _normalize_email(str(request.email))
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=request.name.strip(),
        email=email,
        hashed_password=hash_password(request.password),
        role=_normalize_role(request.role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _auth_response(user, "User created successfully")


@router.post("/login")
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    limiter.check(client_key(req, "login"), limit=20, window_seconds=60)

    email = _normalize_email(str(request.email))
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    return _auth_response(user, "Login successful")


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, req: Request, db: Session = Depends(get_db)):
    """Always return the same message to avoid email enumeration."""
    limiter.check(client_key(req, "forgot"), limit=8, window_seconds=60)

    email = _normalize_email(str(request.email))
    user = db.query(User).filter(User.email == email).first()
    reset_token = None

    if user:
        # Invalidate previous unused tokens
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used.is_(False),
        ).update({"used": True})

        reset_token = generate_reset_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token=reset_token,
                expires_at=datetime.utcnow() + timedelta(hours=RESET_TOKEN_HOURS),
            )
        )
        db.commit()

    # In production, email the token. For local/dev we return it only when created
    # so the flow is testable without SMTP.
    response = {
        "message": "If that email is registered, a reset link has been issued.",
    }
    if reset_token:
        response["reset_token"] = reset_token
        response["expires_in_hours"] = RESET_TOKEN_HOURS
        response["dev_note"] = (
            "Email delivery is not configured. Use reset_token with /auth/reset-password."
        )
    return response


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, req: Request, db: Session = Depends(get_db)):
    limiter.check(client_key(req, "reset"), limit=8, window_seconds=60)

    strength = validate_password_strength(request.new_password)
    if strength:
        raise HTTPException(status_code=400, detail=strength)

    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == request.token)
        .first()
    )
    if not record or record.used or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.hashed_password = hash_password(request.new_password)
    record.used = True
    db.commit()
    return {"message": "Password reset successfully"}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _user_payload(user)


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}


@router.post("/caregiver/assign")
def assign_patient(
    data: CaregiverAssignRequest,
    user: User = Depends(require_roles(ROLE_CAREGIVER, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    patient = db.query(User).filter(User.email == _normalize_email(str(data.patient_email))).first()
    if not patient or (getattr(patient, "role", None) or ROLE_PATIENT) != ROLE_PATIENT:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot assign yourself")

    existing = (
        db.query(CaregiverAssignment)
        .filter(
            CaregiverAssignment.caregiver_id == user.id,
            CaregiverAssignment.patient_id == patient.id,
        )
        .first()
    )
    if existing:
        return {"message": "Already assigned", "patient": _user_payload(patient)}

    db.add(CaregiverAssignment(caregiver_id=user.id, patient_id=patient.id))
    db.commit()
    return {"message": "Patient assigned", "patient": _user_payload(patient)}


@router.get("/caregiver/patients")
def list_assigned_patients(
    user: User = Depends(require_roles(ROLE_CAREGIVER, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(CaregiverAssignment)
        .filter(CaregiverAssignment.caregiver_id == user.id)
        .all()
    )
    patients = []
    for row in rows:
        patient = db.query(User).filter(User.id == row.patient_id).first()
        if patient:
            patients.append(_user_payload(patient))
    return {"patients": patients}
