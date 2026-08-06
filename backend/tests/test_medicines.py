import pytest


def test_create_and_list_medicine(client, patient_auth_headers):
    payload = {
        "name": "Metformin",
        "dosage": "500",
        "dosage_unit": "mg",
        "medicine_type": "Tablet",
        "disease_category": "Diabetes",
        "instructions": "Take with food",
        "quantity_total": 60,
        "stock_remaining": 60,
        "quantity_per_dose": 1,
        "schedules": [
            {"reminder_time": "08:00", "days_of_week": "0,1,2,3,4,5,6"},
            {"reminder_time": "20:00", "days_of_week": "0,1,2,3,4,5,6"},
        ],
    }

    create_res = client.post("/medicines", json=payload, headers=patient_auth_headers)
    assert create_res.status_code == 201
    med = create_res.json()
    assert med["name"] == "Metformin"
    assert med["disease_category"] == "Diabetes"
    assert len(med["schedules"]) == 2

    # List medicines
    list_res = client.get("/medicines", headers=patient_auth_headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["id"] == med["id"]

    # Filter by category
    cat_res = client.get("/medicines?category=Diabetes", headers=patient_auth_headers)
    assert cat_res.status_code == 200
    assert len(cat_res.json()) == 1

    empty_cat_res = client.get("/medicines?category=Thyroid", headers=patient_auth_headers)
    assert empty_cat_res.status_code == 200
    assert len(empty_cat_res.json()) == 0


def test_update_and_delete_medicine(client, patient_auth_headers):
    payload = {
        "name": "Aspirin",
        "dosage": "75",
        "dosage_unit": "mg",
        "quantity_total": 30,
    }
    create_res = client.post("/medicines", json=payload, headers=patient_auth_headers)
    med_id = create_res.json()["id"]

    # Update
    update_res = client.put(
        f"/medicines/{med_id}",
        json={"name": "Aspirin Protect", "dosage": "100"},
        headers=patient_auth_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Aspirin Protect"
    assert update_res.json()["dosage"] == "100"

    # Delete
    delete_res = client.delete(f"/medicines/{med_id}", headers=patient_auth_headers)
    assert delete_res.status_code == 200

    # Verify deleted
    get_res = client.get(f"/medicines/{med_id}", headers=patient_auth_headers)
    assert get_res.status_code == 404
