import pytest


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "PillSync API is running"
    assert "version" in data


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_endpoint(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
