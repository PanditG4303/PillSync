import pytest


def test_ai_key_status_requires_admin(client, patient_auth_headers):
    response = client.get("/admin/ai-keys", headers=patient_auth_headers)
    assert response.status_code == 403


def test_ai_key_set_clear_roundtrip(client, admin_auth_headers, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    response = client.put("/admin/ai-keys", json={"api_key": "sk-or-abc12345"}, headers=admin_auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["configured"] is True
    assert body["source"] == "db"
    assert body["masked_key"] == "sk-o...2345"

    status = client.get("/admin/ai-keys", headers=admin_auth_headers).json()
    assert status["source"] == "db"
    assert status["masked_key"] == "sk-o...2345"

    from services import ai_config

    assert ai_config.resolve_api_key() == "sk-or-abc12345"

    deleted = client.delete("/admin/ai-keys", headers=admin_auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["source"] == "none"


def test_ai_key_env_source_not_removable(client, admin_auth_headers, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "env-key-value")
    response = client.delete("/admin/ai-keys", headers=admin_auth_headers)
    assert response.status_code == 400


def test_ai_key_test_endpoint(client, admin_auth_headers, monkeypatch):
    class FakeResponse:
        status_code = 401

    import httpx

    monkeypatch.setenv("OPENROUTER_API_KEY", "bad-key")
    monkeypatch.setattr(httpx, "Client", lambda timeout: _FakeClient(FakeResponse()))
    response = client.post("/admin/ai-keys/test", headers=admin_auth_headers)
    assert response.status_code == 200
    assert response.json()["ok"] is False
    assert "401" in response.json()["message"]


class _FakeClient:
    def __init__(self, response):
        self._response = response

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, *args, **kwargs):
        return self._response