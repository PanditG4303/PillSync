import pytest


def test_session_listing_after_login(client, test_patient):
    login = client.post(
        "/auth/login",
        json={"email": "patient@example.com", "password": "Password123!"},
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = client.get("/auth/sessions", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    assert any(s["active"] for s in data["sessions"])


def test_revoked_session_token_is_rejected(client, test_patient):
    login = client.post(
        "/auth/login",
        json={"email": "patient@example.com", "password": "Password123!"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sessions = client.get("/auth/sessions", headers=headers).json()["sessions"]
    assert len(sessions) >= 1

    revoked = client.delete(f"/auth/sessions/{sessions[0]['id']}", headers=headers)
    assert revoked.status_code == 200

    # The same token must now be rejected on any authenticated endpoint.
    rejected = client.get("/auth/me", headers=headers)
    assert rejected.status_code == 401
    assert "revoked" in rejected.json()["detail"].lower()


def test_revoke_all_invalidates_sessions(client, test_patient):
    login = client.post(
        "/auth/login",
        json={"email": "patient@example.com", "password": "Password123!"},
    )
    token = login.json()["access_token"]
    first_headers = {"Authorization": f"Bearer {token}"}

    second_login = client.post(
        "/auth/login",
        json={"email": "patient@example.com", "password": "Password123!"},
    )
    second_headers = {"Authorization": f"Bearer {second_login.json()['access_token']}"}

    response = client.post("/auth/sessions/revoke-all", headers=second_headers)
    assert response.status_code == 200
    assert response.json()["revoked"] >= 2

    assert client.get("/auth/me", headers=first_headers).status_code == 401
    assert client.get("/auth/me", headers=second_headers).status_code == 401