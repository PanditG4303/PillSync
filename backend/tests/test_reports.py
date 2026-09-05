import pytest


def test_create_and_list_share(client, patient_auth_headers):
    created = client.post(
        "/reports/shares",
        json={"title": "Doctor visit", "scope": "external", "external": True},
        headers=patient_auth_headers,
    )
    assert created.status_code == 200
    share = created.json()["share"]
    assert share["token"]
    assert share["link"].endswith(f"/public/report/{share['token']}")

    listed = client.get("/reports/shares", headers=patient_auth_headers)
    assert listed.status_code == 200
    assert any(s["id"] == share["id"] for s in listed.json()["shares"])


def test_public_share_endpoint(client, patient_auth_headers, test_patient):
    created = client.post(
        "/reports/shares",
        json={"title": "Doctor visit", "scope": "external", "external": True},
        headers=patient_auth_headers,
    ).json()["share"]

    response = client.get(f"/reports/share/{created['token']}")
    assert response.status_code == 200
    data = response.json()
    assert data["share"]["owner_name"] == "Test Patient"
    assert data["data"]["weekly"]["adherence"] is not None
    assert data["summary"]
    assert data["disclaimer"]


def test_public_share_revoked(client, patient_auth_headers):
    created = client.post(
        "/reports/shares",
        json={"title": "temp", "scope": "patient", "external": False},
        headers=patient_auth_headers,
    ).json()["share"]

    revoked = client.delete(f"/reports/shares/{created['id']}", headers=patient_auth_headers)
    assert revoked.status_code == 200

    response = client.get(f"/reports/share/{created['token']}")
    assert response.status_code == 404


def test_adherence_report_has_insights(client, patient_auth_headers):
    response = client.get("/reports/adherence?period=week", headers=patient_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "dose_windows" in data
    assert "per_medicine" in data
    assert "expected_vs_taken" in data
    assert data["expected_vs_taken"]["expected"] >= 0