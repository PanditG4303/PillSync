"""Tests for email OTP passwordless login."""


def test_otp_send_returns_code_without_smtp(client):
    res = client.post("/auth/otp/send", json={"email": "otp-user@example.com"})
    assert res.status_code == 200
    body = res.json()
    assert body["message"]
    assert body["dev_otp"]
    assert len(body["dev_otp"]) == 6
    assert body["dev_otp"].isdigit()


def test_otp_verify_creates_user_and_returns_session(client):
    send_res = client.post("/auth/otp/send", json={"email": "otp-user@example.com"})
    otp = send_res.json()["dev_otp"]

    verify_res = client.post(
        "/auth/otp/verify",
        json={"email": "otp-user@example.com", "otp": otp},
    )
    assert verify_res.status_code == 200
    body = verify_res.json()
    assert body["access_token"]
    assert body["user"]["email"] == "otp-user@example.com"
    assert body["user"]["auth_provider"] == "otp"

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "otp-user@example.com"


def test_otp_reuse_is_blocked(client):
    send_res = client.post("/auth/otp/send", json={"email": "otp-user@example.com"})
    otp = send_res.json()["dev_otp"]
    email = "otp-user@example.com"

    first = client.post("/auth/otp/verify", json={"email": email, "otp": otp})
    assert first.status_code == 200

    second = client.post("/auth/otp/verify", json={"email": email, "otp": otp})
    assert second.status_code == 400


def test_otp_wrong_code_fails(client):
    send_res = client.post("/auth/otp/send", json={"email": "otp-user@example.com"})
    assert send_res.status_code == 200

    res = client.post(
        "/auth/otp/verify",
        json={"email": "otp-user@example.com", "otp": "000000"},
    )
    assert res.status_code == 400


def test_otp_resend_cooldown(client):
    first = client.post("/auth/otp/send", json={"email": "otp-user@example.com"})
    assert first.status_code == 200
    second = client.post("/auth/otp/send", json={"email": "otp-user@example.com"})
    assert second.status_code == 429