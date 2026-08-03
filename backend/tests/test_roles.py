import pytest


def test_caregiver_assignment_and_access(
    client, test_patient, test_caregiver, caregiver_auth_headers, patient_auth_headers
):
    # Caregiver assigns patient
    assign_res = client.post(
        "/auth/caregiver/assign",
        json={"patient_email": test_patient.email},
        headers=caregiver_auth_headers,
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["message"] in ("Patient assigned", "Already assigned")

    # Caregiver lists assigned patients
    patients_res = client.get(
        "/auth/caregiver/patients",
        headers=caregiver_auth_headers,
    )
    assert patients_res.status_code == 200
    patient_emails = [p["email"] for p in patients_res.json()["patients"]]
    assert test_patient.email in patient_emails

    # Caregiver can view assigned patient's medicine list
    meds_res = client.get(
        f"/medicines?patient_id={test_patient.id}",
        headers=caregiver_auth_headers,
    )
    assert meds_res.status_code == 200

    # Another patient cannot view target user's data
    unauth_patient_res = client.get(
        f"/medicines?patient_id={test_caregiver.id}",
        headers=patient_auth_headers,
    )
    # Patient viewing another patient's data returns 403 Forbidden
    assert unauth_patient_res.status_code == 403



def test_admin_overview_and_user_management(client, admin_auth_headers, test_patient):
    # Admin overview
    overview_res = client.get("/admin/overview", headers=admin_auth_headers)
    assert overview_res.status_code == 200
    data = overview_res.json()
    assert "users" in data
    assert data["users"]["total"] >= 1

    # Admin user list
    users_res = client.get("/admin/users", headers=admin_auth_headers)
    assert users_res.status_code == 200
    users = users_res.json()["users"]
    assert len(users) >= 1

    # Admin update role
    role_res = client.patch(
        f"/admin/users/{test_patient.id}/role",
        json={"role": "Caregiver"},
        headers=admin_auth_headers,
    )
    assert role_res.status_code == 200
    assert role_res.json()["user"]["role"] == "Caregiver"
