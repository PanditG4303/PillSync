import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Force SQLite for test environment
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from sqlalchemy.pool import StaticPool

import database
from database import Base, get_db
from core.security import create_access_token, hash_password
from models import User, Medicine, CaregiverAssignment

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
database.SessionLocal = TestingSessionLocal

from app import app


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()



@pytest.fixture
def test_patient(db_session):
    user = User(
        name="Test Patient",
        email="patient@example.com",
        hashed_password=hash_password("Password123!"),
        role="Patient",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_caregiver(db_session):
    user = User(
        name="Test Caregiver",
        email="caregiver@example.com",
        hashed_password=hash_password("Password123!"),
        role="Caregiver",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_admin(db_session):
    user = User(
        name="Test Admin",
        email="admin@example.com",
        hashed_password=hash_password("Password123!"),
        role="Admin",
        is_active=True,
    )

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def patient_auth_headers(test_patient):
    token = create_access_token(test_patient.id, test_patient.email, test_patient.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def caregiver_auth_headers(test_caregiver):
    token = create_access_token(test_caregiver.id, test_caregiver.email, test_caregiver.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(test_admin):
    token = create_access_token(test_admin.id, test_admin.email, test_admin.role)
    return {"Authorization": f"Bearer {token}"}
