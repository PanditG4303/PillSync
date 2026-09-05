"""Tests for the AI router, AI features, and Google OAuth."""

from datetime import datetime

import pytest

from core.security import hash_password
from models import Medicine, MedicationSchedule, User, UserPreference


# ---------------------------------------------------------------------------
# AI model config unit tests (two models: Gemma for OCR, Nemotron elsewhere)
# ---------------------------------------------------------------------------

def test_model_routing_defaults(monkeypatch):
    from services import ai_config

    monkeypatch.delenv("AI_MODEL_OCR", raising=False)
    monkeypatch.delenv("AI_MODEL_ASSISTANT", raising=False)

    assert ai_config.model_for("ocr") == "google/gemma-4-26b-a4b-it:free"
    assert ai_config.model_for("assistant") == "nvidia/nemotron-3.5-lightning:free"
    assert ai_config.model_for("medicine_chat") == "nvidia/nemotron-3.5-lightning:free"
    assert ai_config.model_for("lifestyle") == "nvidia/nemotron-3.5-lightning:free"
    assert ai_config.model_for("report") == "nvidia/nemotron-3.5-lightning:free"
    assert ai_config.model_for("general") == "nvidia/nemotron-3.5-lightning:free"
    assert ai_config.model_for("unknown-task") == "nvidia/nemotron-3.5-lightning:free"


def test_model_routing_env_overrides(monkeypatch):
    from services import ai_config

    monkeypatch.setenv("AI_MODEL_OCR", "custom/ocr-model")
    monkeypatch.setenv("AI_MODEL_ASSISTANT", "custom/assistant-model")
    assert ai_config.model_for("ocr") == "custom/ocr-model"
    assert ai_config.model_for("assistant") == "custom/assistant-model"
    assert ai_config.model_for("anything-else") == "custom/assistant-model"


def test_ai_router_api_key_resolution(monkeypatch):
    from services import ai_config

    monkeypatch.setenv("OPENROUTER_API_KEY", "shared-key")
    assert ai_config.resolve_api_key() == "shared-key"
    assert ai_config.is_configured() is True

    monkeypatch.delenv("OPENROUTER_API_KEY")
    assert ai_config.resolve_api_key() == ""
    assert ai_config.is_configured() is False


def test_ai_router_ignores_stale_env_keys(monkeypatch):
    from services import ai_config

    monkeypatch.setenv("AI_ROUTER_API_KEY", "stale-key")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    assert ai_config.resolve_api_key() == ""


def test_ai_router_generate_requires_key(monkeypatch):
    from services.ai_config import AIRouter, AIRouterError

    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(AIRouterError):
        AIRouter().generate("assistant", [{"role": "user", "content": "hi"}])


# ---------------------------------------------------------------------------
# SMS abstraction tests
# ---------------------------------------------------------------------------

def test_sms_disabled_without_config(monkeypatch):
    from services import sms

    monkeypatch.delenv("SMS_PROVIDER", raising=False)
    assert sms.is_configured() is False
    assert sms.send_sms("+1234567890", "hello") is False

    monkeypatch.setenv("SMS_PROVIDER", "fast2sms")
    assert sms.is_configured() is False
    monkeypatch.setenv("FAST2SMS_API_KEY", "key")
    assert sms.is_configured() is False
    monkeypatch.setenv("FAST2SMS_SENDER_ID", "TESTID")
    assert sms.is_configured() is True


def test_sms_msg91_requires_all_credentials(monkeypatch):
    from services import sms

    monkeypatch.setenv("SMS_PROVIDER", "msg91")
    monkeypatch.setenv("MSG91_AUTH_KEY", "auth")
    assert sms.is_configured() is False
    monkeypatch.setenv("MSG91_SENDER_ID", "SNDR")
    assert sms.is_configured() is True


def test_sms_unknown_provider_ignored(monkeypatch):
    from services import sms

    monkeypatch.setenv("SMS_PROVIDER", "twilio")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "sid")
    assert sms.is_configured() is False
    assert sms.send_sms("+1234567890", "hi") is False


def test_sms_bad_phone_returns_false(monkeypatch):
    from services import sms

    monkeypatch.setenv("SMS_PROVIDER", "fast2sms")
    monkeypatch.setenv("FAST2SMS_API_KEY", "key")
    monkeypatch.setenv("FAST2SMS_SENDER_ID", "TESTID")
    assert sms.send_sms("abc", "hi") is False


def test_sms_pause_code_roundtrip(monkeypatch):
    from services import sms

    monkeypatch.setenv("SMS_PROVIDER", "fast2sms")
    code = sms.build_pause_code(42, hours=24)
    assert sms.verify_pause_code(code) == 42
    assert sms.verify_pause_code(code[:4] + "x" + code[5:]) is None
    assert sms.verify_pause_code("not-a-code") is None


def test_sms_build_reminder_message(monkeypatch):
    from services import sms

    monkeypatch.setenv("FRONTEND_URL", "https://pillsync.example")
    message = sms.build_reminder_sms("Alice", "Time to take Warfarin 5 mg", "CODE123")
    assert message.startswith("Hi Alice, Time to take Warfarin")
    assert "https://pillsync.example/sms/pause?code=CODE123" in message
    assert "https://pillsync.example/settings" in message


# ---------------------------------------------------------------------------
# AI feature endpoints (graceful fallback without API key)
# ---------------------------------------------------------------------------

@pytest.fixture
def patient_with_medicines(db_session):
    user = User(
        name="AI Patient",
        email="ai-patient@example.com",
        hashed_password=hash_password("Password123!"),
        role="Patient",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    warfarin = Medicine(
        user_id=user.id, name="Warfarin", dosage="5", dosage_unit="mg",
        instructions="evening", duration="30 days", doctor_notes="INR check weekly",
        is_active=True, quantity_total=60, stock_remaining=40,
    )
    aspirin = Medicine(
        user_id=user.id, name="Aspirin", dosage="75", dosage_unit="mg",
        is_active=True, quantity_total=60, stock_remaining=50,
    )
    db_session.add_all([warfarin, aspirin])
    db_session.commit()
    db_session.refresh(warfarin)
    db_session.refresh(aspirin)
    return user, warfarin, aspirin


def _auth_headers(client, db_session, email):
    from core.security import create_access_token

    user = db_session.query(User).filter(User.email == email).first()
    token = create_access_token(user.id, user.email, user.role)
    return {"Authorization": f"Bearer {token}"}


def test_interaction_checker_fallback_full(client, monkeypatch, patient_with_medicines, db_session):
    monkeypatch.delenv("AI_ROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    user, warfarin, aspirin = patient_with_medicines
    headers = _auth_headers(client, db_session, "ai-patient@example.com")
    res = client.post(
        "/ai/interactions",
        json={"medicine_ids": [warfarin.id, aspirin.id]},
        headers=headers,
    )
    body = res.json()
    assert res.status_code == 200
    assert body["ai_configured"] is False
    assert body["disclaimer"]
    assert len(body["interactions"]) >= 1
    names = {n.lower() for n in body["interactions"][0]["medicines"]}
    assert "warfarin" in names and "aspirin" in names
    assert body["interactions"][0]["severity"] in ("Low", "Medium", "High")


def test_interaction_checker_requires_medicine(client, db_session, patient_with_medicines):
    user, warfarin, aspirin = patient_with_medicines
    headers = _auth_headers(client, db_session, "ai-patient@example.com")
    res = client.post("/ai/interactions", json={"medicine_ids": [9999]}, headers=headers)
    assert res.status_code == 404


def test_lifestyle_fallback(client, monkeypatch, patient_with_medicines, db_session):
    monkeypatch.delenv("AI_ROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    headers = _auth_headers(client, db_session, "ai-patient@example.com")
    res = client.post("/ai/lifestyle", json={"topic": "hydration"}, headers=headers)
    body = res.json()
    assert res.status_code == 200
    assert body["advice"]
    assert body["engine"] == "rule-based"
    assert body["ai_configured"] is False
    assert body["disclaimer"]

    unknown = client.post("/ai/lifestyle", json={"topic": "bogus-topic"}, headers=headers)
    assert unknown.json()["topic"] == "general"


# ---------------------------------------------------------------------------
# AI health summary endpoints
# ---------------------------------------------------------------------------

def test_health_summary_fallback(client, monkeypatch, patient_with_medicines, db_session):
    monkeypatch.delenv("AI_ROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    headers = _auth_headers(client, db_session, "ai-patient@example.com")
    res = client.get("/reports/summary", headers=headers)
    body = res.json()
    assert res.status_code == 200
    assert body["engine"] == "rule-based"
    assert "Adherence this week is" in body["summary"]
    assert "counts as missed" in body["summary"]
    assert body["data"]["weekly"]["adherence"] >= 0
    assert body["disclaimer"]

    dl = client.get("/reports/summary/download", headers=headers)
    assert dl.status_code == 200
    assert "attachment" in dl.headers["content-disposition"]
    assert "# PillSync AI Health Summary" in dl.text


def test_today_stats(client, patient_with_medicines, db_session):
    headers = _auth_headers(client, db_session, "ai-patient@example.com")
    res = client.get("/reports/today-stats", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["stats"]["adherence"] >= 0
    assert body["streak"] >= 0


# ---------------------------------------------------------------------------
# Assistant routing and fallback
# ---------------------------------------------------------------------------

def test_assistant_fallback(client, monkeypatch, patient_with_medicines, db_session):
    monkeypatch.delenv("AI_ROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    headers = _auth_headers(client, db_session, "ai-patient@example.com")
    res = client.post("/assistant/chat", json={"message": "hello"}, headers=headers)
    body = res.json()
    assert res.status_code == 200
    assert body["reply"]
    assert body["engine"] == "rule-based"
    assert body["disclaimer"]
    assert isinstance(body["suggestions"], list) and body["suggestions"]


def test_assistant_accepts_history(client, monkeypatch, patient_with_medicines, db_session):
    monkeypatch.delenv("AI_ROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    headers = _auth_headers(client, db_session, "ai-patient@example.com")
    res = client.post(
        "/assistant/chat",
        json={
            "message": "what is the dose?",
            "history": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}],
        },
        headers=headers,
    )
    assert res.status_code == 200


# ---------------------------------------------------------------------------
# Google OAuth (authorization-code flow)
# ---------------------------------------------------------------------------

def _patch_token_exchange(monkeypatch, id_token="fake-google-id-token"):
    """Fake the httpx POST to Google's token endpoint."""
    import sys

    target = sys.modules["auth"]

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"id_token": id_token}

    monkeypatch.setattr(target.httpx, "post", lambda *a, **k: FakeResponse(), raising=True)


def test_google_status_disabled(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    res = client.get("/auth/google/status")
    assert res.status_code == 200
    assert res.json() == {"enabled": False}


def test_google_status_enabled(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    res = client.get("/auth/google/status")
    assert res.json() == {"enabled": True}


def test_google_authorize_disabled_without_credentials(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    res = client.get("/auth/google/authorize")
    assert res.status_code == 503


def test_google_authorize_requires_secret_too(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    res = client.get("/auth/google/authorize")
    assert res.status_code == 503


def test_google_authorize_returns_consent_url(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    res = client.get("/auth/google/authorize")
    body = res.json()
    assert res.status_code == 200
    assert body["url"].startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "client_id=test-client-id.apps.googleusercontent.com" in body["url"]
    assert "redirect_uri=" in body["url"]
    assert "state=" in body["url"]
    assert "response_type=code" in body["url"]


def test_google_callback_bad_state_redirects_to_login(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    res = client.get("/auth/google/callback", follow_redirects=False, params={"code": "abc", "state": "tampered"})
    assert res.status_code == 302
    assert res.headers["location"].endswith("/login?google=error")


def test_google_callback_exchange_failure_redirects_to_login(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")

    import sys

    target = sys.modules["auth"]

    class FailedResponse:
        status_code = 400

        def json(self):
            return {}

    monkeypatch.setattr(target.httpx, "post", lambda *a, **k: FailedResponse(), raising=True)

    # Reuse a valid state from the authorize endpoint.
    auth_res = client.get("/auth/google/authorize").json()
    state = auth_res["url"].split("state=")[1].split("&")[0]
    res = client.get("/auth/google/callback", follow_redirects=False, params={"code": "abc", "state": state})
    assert res.status_code == 302
    assert res.headers["location"].endswith("/login?google=error")


def test_google_login_new_user_flow(client, monkeypatch, db_session):
    """Full flow: authorize -> callback -> new user created -> JWT returned."""
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")

    import sys

    target = sys.modules["auth"]
    _patch_token_exchange(monkeypatch)

    fake_google = type(
        "FakeGoogle",
        (),
        {
            "verify_oauth2_token": staticmethod(
                lambda token, req, client_id: {
                    "email": "new.google.user@gmail.com",
                    "name": "Google User",
                    "email_verified": True,
                }
            )
        },
    )()
    old = getattr(target, "google_id_token", None)
    monkeypatch.setattr(target, "google_id_token", fake_google, raising=True)

    auth_res = client.get("/auth/google/authorize").json()
    state = auth_res["url"].split("state=")[1].split("&")[0]
    res = client.get("/auth/google/callback", follow_redirects=False, params={"code": "auth-code", "state": state})

    assert res.status_code == 302
    location = res.headers["location"]
    assert location.startswith("http://localhost:5173/oauth-callback?token=")
    token = location.split("token=")[1]

    created = db_session.query(User).filter(User.email == "new.google.user@gmail.com").first()
    assert created is not None
    assert created.hashed_password is None

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "new.google.user@gmail.com"


def test_google_login_existing_user(client, monkeypatch, db_session, test_patient):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")

    import sys

    target = sys.modules["auth"]
    _patch_token_exchange(monkeypatch)

    fake_google = type(
        "FakeGoogle",
        (),
        {
            "verify_oauth2_token": staticmethod(
                lambda token, req, client_id: {
                    "email": test_patient.email,
                    "name": "Test Patient",
                    "email_verified": True,
                }
            )
        },
    )()
    monkeypatch.setattr(target, "google_id_token", fake_google, raising=True)

    auth_res = client.get("/auth/google/authorize").json()
    state = auth_res["url"].split("state=")[1].split("&")[0]
    res = client.get("/auth/google/callback", follow_redirects=False, params={"code": "auth-code", "state": state})

    assert res.status_code == 302
    assert "/oauth-callback?token=" in res.headers["location"]
    assert db_session.query(User).filter(User.email == test_patient.email).count() == 1


# ---------------------------------------------------------------------------
# Structured prescription fields
# ---------------------------------------------------------------------------

def test_text_parser_extracts_duration_and_notes():
    from services.ocr import PrescriptionParser

    medicines = PrescriptionParser().parse(
        "Amoxicillin 500mg three times daily for 7 days after meals\n"
        "Notes: complete the full course. Qty 21"
    )
    match = next((m for m in medicines if m["name"].lower() == "amoxicillin"), None)
    assert match is not None
    assert "7 days" in match["duration"]
    assert "complete the full course" in match["doctor_notes"]