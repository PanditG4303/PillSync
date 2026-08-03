from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, Date, Time, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Patient")
    is_active = Column(Boolean, default=True)

    medicines = relationship("Medicine", back_populates="user", cascade="all, delete-orphan")
    history = relationship("MedicationHistory", back_populates="user", cascade="all, delete-orphan")
    device_tokens = relationship("DeviceToken", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reset_tokens")


class CaregiverAssignment(Base):
    __tablename__ = "caregiver_assignments"

    id = Column(Integer, primary_key=True, index=True)
    caregiver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    dosage = Column(String, default="")
    dosage_unit = Column(String, default="")
    medicine_type = Column(String, default="")
    disease_category = Column(String, default="General")
    instructions = Column(Text, default="")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    quantity_total = Column(Float, default=0.0)
    stock_remaining = Column(Float, default=0.0)
    quantity_per_dose = Column(Float, default=1.0)
    low_stock_threshold_days = Column(Integer, default=5)
    last_refill_alert_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="medicines")
    schedules = relationship("MedicationSchedule", back_populates="medicine", cascade="all, delete-orphan")
    history = relationship("MedicationHistory", back_populates="medicine", cascade="all, delete-orphan")


class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    reminder_time = Column(Time, nullable=False)
    days_of_week = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="schedules")


class MedicationHistory(Base):
    __tablename__ = "medication_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("medication_schedules.id"), nullable=True)
    scheduled_datetime = Column(DateTime, nullable=False)
    taken_datetime = Column(DateTime, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="history")
    medicine = relationship("Medicine", back_populates="history")


class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fcm_token = Column(String, unique=True, nullable=False)
    device_type = Column(String, default="web")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="device_tokens")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    push_notifications_enabled = Column(Boolean, default=True)
    reminder_notifications_enabled = Column(Boolean, default=True)
    refill_notifications_enabled = Column(Boolean, default=True)
    advance_notice_minutes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
