"""Password hashing and JWT authentication."""

import os
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from core.constants import MIN_PASSWORD_LENGTH, VALID_ROLES, resolve_jwt_secret
from database import get_db
from models import User

JWT_SECRET = resolve_jwt_secret()
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def validate_password_strength(password: str) -> Optional[str]:
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    if password.isdigit() or password.isalpha():
        return "Password must include letters and numbers"
    return None


def create_access_token(user_id: int, email: str, role: str = "Patient") -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def require_roles(*roles: str) -> Callable:
    allowed = set(roles) & set(VALID_ROLES)

    def dependency(user: User = Depends(get_current_user)) -> User:
        role = getattr(user, "role", None) or "Patient"
        if role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return dependency


def resolve_target_user_id(db: Session, current_user: User, patient_id: Optional[int] = None) -> int:
    """
    Resolves the effective target user ID for a request.
    Patients can only access their own data.
    Caregivers can access data of patients assigned to them.
    Admins can access data of any patient.
    """
    if patient_id is None or patient_id == current_user.id:
        return current_user.id

    from models import CaregiverAssignment, User as UserModel

    user_role = getattr(current_user, "role", None) or "Patient"
    if user_role not in ("Caregiver", "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patients cannot access data of other users",
        )

    target_patient = db.query(UserModel).filter(UserModel.id == patient_id).first()
    if not target_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target patient not found",
        )

    if user_role == "Caregiver":
        assigned = (
            db.query(CaregiverAssignment)
            .filter(
                CaregiverAssignment.caregiver_id == current_user.id,
                CaregiverAssignment.patient_id == patient_id,
            )
            .first()
        )
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient is not assigned to this caregiver",
            )

    return patient_id

