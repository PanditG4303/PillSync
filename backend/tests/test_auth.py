import pytest


def test_register_user_success(client):
    payload = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "Patient",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "jane@example.com"
    assert data["user"]["role"] == "Patient"


def test_register_password_mismatch(client):
    payload = {
        "name": "Jane Doe",
        "email": "jane2@example.com",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!",
        "role": "Patient",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 400
    assert "do not match" in response.json()["detail"]


def test_register_weak_password(client):
    payload = {
        "name": "Jane Doe",
        "email": "jane3@example.com",
        "password": "short",
        "confirm_password": "short",
        "role": "Patient",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code in (400, 422)


def test_login_success(client, test_patient):
    response = client.post(
        "/auth/login",
        json={"email": test_patient.email, "password": "Password123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_patient.email


def test_login_invalid_credentials(client, test_patient):
    response = client.post(
        "/auth/login",
        json={"email": test_patient.email, "password": "WrongPassword!"},
    )
    assert response.status_code == 401


def test_me_endpoint(client, patient_auth_headers, test_patient):
    response = client.get("/auth/me", headers=patient_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_patient.id
    assert data["email"] == test_patient.email


def test_forgot_and_reset_password(client, test_patient):
    # Forgot password
    forgot_res = client.post(
        "/auth/forgot-password",
        json={"email": test_patient.email},
    )
    assert forgot_res.status_code == 200
    data = forgot_res.json()
    token = data.get("reset_token")
    assert token is not None

    # Reset password
    reset_res = client.post(
        "/auth/reset-password",
        json={"token": token, "new_password": "NewSecretPass123!"},
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["message"] == "Password reset successfully"

    # Login with new password
    login_res = client.post(
        "/auth/login",
        json={"email": test_patient.email, "password": "NewSecretPass123!"},
    )
    assert login_res.status_code == 200
