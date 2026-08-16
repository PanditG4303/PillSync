import hashlib
import hmac
import logging
import os
import secrets
import urllib.parse
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
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
    hash_session_token,
    require_roles,
    validate_password_strength,
    verify_password,
)
from database import get_db
from models import AuthToken, CaregiverAssignment, OtpCode, PasswordResetToken, User

router = APIRouter(prefix="/auth", tags=["Authentication"])

RESET_TOKEN_HOURS = 1

logger = logging.getLogger("pillsync-auth")

try:
    from google.auth.transport import requests as google_requests  # noqa: F401
    from google.oauth2 import id_token as google_id_token  # noqa: F401
except ImportError:
    google_id_token = None


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=MIN_PASSWORD_LENGTH)
    confirm_password: str
    role: str = DEFAULT_ROLE


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OtpSendRequest(BaseModel):
    email: EmailStr


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=8)


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
        "profile_picture": getattr(user, "profile_picture", None) or "",
        "auth_provider": getattr(user, "auth_provider", None) or "email",
    }


def _store_session(db: Session, user: User, access_token: str) -> None:
    """Persist the issued token so it can be listed and revoked later."""
    record = AuthToken(
        user_id=user.id,
        token=hash_session_token(access_token),
        expires_at=datetime.utcnow() + timedelta(hours=int(os.getenv("JWT_EXPIRE_HOURS", "24"))),
        used=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)


def _auth_response(db: Session, user: User, message: str) -> dict:
    role = getattr(user, "role", None) or DEFAULT_ROLE
    access_token = create_access_token(user.id, user.email, role)
    _store_session(db, user, access_token)
    return {
        "message": message,
        "access_token": access_token,
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
    return _auth_response(db, user, "User created successfully")


@router.post("/login")
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    limiter.check(client_key(req, "login"), limit=20, window_seconds=60)

    email = _normalize_email(str(request.email))
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    return _auth_response(db, user, "Login successful")


# ---------------------------------------------------------------- OTP login

OTP_LIFETIME_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def _otp_email_html(otp: str, expires_minutes: int) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f9fc;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;text-align:center;">
      <h2 style="margin:0 0 8px;color:#0f2a43;">PillSync Sign-In Code</h2>
      <p style="color:#5b7089;font-size:14px;line-height:1.6;">Use this code to sign in to your PillSync account. It expires in {expires_minutes} minutes.</p>
      <div style="display:inline-block;margin:16px 0;padding:14px 32px;border-radius:12px;background:#0f2a43;color:#ffffff;font-size:28px;font-weight:bold;letter-spacing:8px;">{otp}</div>
      <p style="color:#9aa8b8;font-size:12px;">If you didn't request this code, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>"""


def _send_otp_email(email: str, otp: str) -> bool:
    try:
        from services.email import send_email

        return send_email(
            email,
            "PillSync sign-in code",
            _otp_email_html(otp, OTP_LIFETIME_MINUTES),
        )
    except Exception as exc:  # email problems should never break the API
        logger.warning("OTP email sending failed: %s", exc)
        return False


@router.post("/otp/send")
def otp_send(request: OtpSendRequest, req: Request, db: Session = Depends(get_db)):
    """Email a one-time passcode for passwordless sign-in."""
    limiter.check(client_key(req, "otp-send"), limit=5, window_seconds=60)
    limiter.check(client_key(req, f"otp-send-{str(request.email).lower()}"), limit=5, window_seconds=60)

    email = _normalize_email(str(request.email))

    # Enforce a resend cooldown so users cannot spam themselves.
    recent = (
        db.query(OtpCode)
        .filter(
            OtpCode.email == email,
            OtpCode.used.is_(False),
            OtpCode.created_at > datetime.utcnow() - timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS),
        )
        .first()
    )
    if recent:
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {OTP_RESEND_COOLDOWN_SECONDS}s before requesting another code.",
        )

    otp = _generate_otp()
    db.add(
        OtpCode(
            email=email,
            otp_hash=_hash_otp(otp),
            expires_at=datetime.utcnow() + timedelta(minutes=OTP_LIFETIME_MINUTES),
        )
    )
    db.commit()

    delivered = _send_otp_email(email, otp)
    response = {
        "message": "A sign-in code has been sent to your email.",
        "expires_in_minutes": OTP_LIFETIME_MINUTES,
        "resend_after_seconds": OTP_RESEND_COOLDOWN_SECONDS,
    }
    if not delivered:
        # No SMTP configured: return the code in dev so the flow stays testable.
        response["dev_note"] = (
            "SMTP is not configured. The code is returned here for development only."
        )
        response["dev_otp"] = otp
    return response


@router.post("/otp/verify")
def otp_verify(request: OtpVerifyRequest, req: Request, db: Session = Depends(get_db)):
    """Verify the passcode, sign the user in and persist the session."""
    limiter.check(client_key(req, "otp-verify"), limit=10, window_seconds=60)

    email = _normalize_email(str(request.email))
    otp = request.otp.strip()

    now = datetime.utcnow()
    record = (
        db.query(OtpCode)
        .filter(OtpCode.email == email, OtpCode.used.is_(False), OtpCode.expires_at > now)
        .order_by(OtpCode.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired code. Request a new one.")

    if not secrets.compare_digest(record.otp_hash, _hash_otp(otp)):
        record.attempts = (record.attempts or 0) + 1
        if record.attempts >= OTP_MAX_ATTEMPTS:
            record.used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect code. Please try again.")

    record.used = True
    db.commit()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=email.split("@")[0],
            email=email,
            hashed_password=None,
            role=DEFAULT_ROLE,
            auth_provider="otp",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not getattr(user, "auth_provider", None):
            user.auth_provider = "otp"
            db.commit()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    return _auth_response(db, user, "Login successful")


def _google_creds() -> tuple[str, str]:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    return client_id, client_secret


def _google_enabled() -> bool:
    client_id, client_secret = _google_creds()
    return bool(client_id and client_secret)


def _google_redirect_uri(request: Request) -> str:
    return f"{str(request.base_url).rstrip('/')}/auth/google/callback"


def _make_oauth_state() -> str:
    """Stateless CSRF state: random nonce signed with the JWT secret."""
    nonce = secrets.token_urlsafe(16)
    digest = hmac.new(
        os.getenv("JWT_SECRET", "pillsync-dev").encode(),
        nonce.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{nonce}.{digest}"


def _verify_oauth_state(state: str) -> bool:
    try:
        nonce, digest = state.split(".", 1)
    except ValueError:
        return False
    expected = hmac.new(
        os.getenv("JWT_SECRET", "pillsync-dev").encode(),
        nonce.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, digest)


GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES = "openid email profile"


@router.get("/google/status")
def google_status():
    """Advertises whether Google login is configured (used by the login page)."""
    return {"enabled": _google_enabled()}


@router.get("/google/authorize")
def google_authorize(request: Request):
    """Start the Google authorization-code flow. Returns the consent URL."""
    limiter.check(client_key(request, "google-auth"), limit=30, window_seconds=60)

    client_id, client_secret = _google_creds()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=503,
            detail=(
                "Google login is not configured. Set GOOGLE_CLIENT_ID and "
                "GOOGLE_CLIENT_SECRET in backend/.env."
            ),
        )
    if google_id_token is None:
        raise HTTPException(
            status_code=503,
            detail="Google login dependencies are not installed. Run: pip install google-auth",
        )

    params = {
        "client_id": client_id,
        "redirect_uri": _google_redirect_uri(request),
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "state": _make_oauth_state(),
        "prompt": "select_account",
    }
    return {"url": GOOGLE_AUTHORIZE_URL + "?" + urllib.parse.urlencode(params)}


@router.get("/google/callback")
def google_callback(
    request: Request,
    db: Session = Depends(get_db),
    code: str = Query(default=""),
    state: str = Query(default=""),
):
    """Exchange the authorization code, sign the user in, return to the app."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    def _fail() -> RedirectResponse:
        return RedirectResponse(f"{frontend_url}/login?google=error", status_code=302)

    if not _verify_oauth_state(state):
        return _fail()

    client_id, client_secret = _google_creds()
    if not client_id or not client_secret or google_id_token is None:
        return _fail()

    try:
        token_response = httpx.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": _google_redirect_uri(request),
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
        if token_response.status_code != 200:
            return _fail()

        info = google_id_token.verify_oauth2_token(
            token_response.json()["id_token"],
            google_requests.Request(),
            client_id,
        )
    except Exception as exc:  # bad code, network or token issues
        logger.warning("Google OAuth exchange failed: %s", exc.__class__.__name__)
        return _fail()

    email = _normalize_email(str(info.get("email") or ""))
    if not email:
        return _fail()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        if info.get("email_verified") is not True:
            return _fail()
        user = User(
            name=str(info.get("name") or email.split("@")[0]).strip(),
            email=email,
            hashed_password=None,  # Google users authenticate via OAuth only
            role=DEFAULT_ROLE,
            profile_picture=str(info.get("picture") or "").strip(),
            auth_provider="google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Keep the profile picture fresh on every sign-in.
        picture = str(info.get("picture") or "").strip()
        if picture and getattr(user, "profile_picture", None) != picture:
            user.profile_picture = picture
            if not getattr(user, "auth_provider", None):
                user.auth_provider = "google"
            db.commit()

    if not user.is_active:
        return _fail()

    access_token = create_access_token(user.id, user.email, user.role)
    _store_session(db, user, access_token)
    return RedirectResponse(
        f"{frontend_url}/oauth-callback?token={access_token}",
        status_code=302,
    )


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


@router.get("/sessions")
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the signed-in sessions (devices) for the current user."""
    now = datetime.utcnow()
    current_record = (
        db.query(AuthToken)
        .filter(AuthToken.user_id == user.id, AuthToken.used.is_(False))
        .order_by(AuthToken.created_at.desc())
        .all()
    )
    sessions = []
    for record in current_record:
        sessions.append(
            {
                "id": record.id,
                "created_at": record.created_at.isoformat() if record.created_at else None,
                "expires_at": record.expires_at.isoformat() if record.expires_at else None,
                "active": record.expires_at is None or record.expires_at > now,
            }
        )
    return {"sessions": sessions, "count": len(sessions)}


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-revoke one session. The revoked token stops working immediately."""
    record = (
        db.query(AuthToken)
        .filter(AuthToken.id == session_id, AuthToken.user_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Session not found")
    record.used = True
    db.commit()
    return {"message": "Session revoked"}


@router.post("/sessions/revoke-all")
def revoke_all_sessions(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke every session for the current user, including this one."""
    headers = {"authorization": request.headers.get("authorization", "")}
    current_hash = None
    if headers["authorization"].lower().startswith("bearer "):
        current_hash = hash_session_token(headers["authorization"][7:].strip())

    updated = (
        db.query(AuthToken)
        .filter(AuthToken.user_id == user.id, AuthToken.used.is_(False))
        .update({"used": True})
    )
    db.commit()
    return {
        "message": f"Revoked {updated} session(s). You have been signed out.",
        "revoked": updated,
        "current_revoked": current_hash is not None,
    }


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
