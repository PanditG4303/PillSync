import pytest


def test_refill_predictions_and_stock_updates(client, patient_auth_headers):
    # 1. Create a medicine with 10 tablets, 2 doses per day (1 per dose = 2 daily) -> 5 days remaining
    payload = {
        "name": "Thyronorm",
        "dosage": "50",
        "dosage_unit": "mcg",
        "disease_category": "Thyroid",
        "quantity_total": 10,
        "stock_remaining": 10,
        "quantity_per_dose": 1,
        "low_stock_threshold_days": 5,
        "schedules": [
            {"reminder_time": "08:00", "days_of_week": "0,1,2,3,4,5,6"},
            {"reminder_time": "20:00", "days_of_week": "0,1,2,3,4,5,6"},
        ],
    }
    create_res = client.post("/medicines", json=payload, headers=patient_auth_headers)
    assert create_res.status_code == 201
    med_id = create_res.json()["id"]

    # 2. Get predictions
    pred_res = client.get("/refills/predictions", headers=patient_auth_headers)
    assert pred_res.status_code == 200
    summary = pred_res.json()
    assert summary["total_tracked"] == 1
    p = summary["predictions"][0]
    assert p["name"] == "Thyronorm"
    assert p["stock_remaining"] == 10.0
    assert p["doses_per_day"] == 2.0
    assert p["days_remaining"] == 5.0
    assert p["status"] == "low"
    assert p["alert_message"] is not None

    # 3. Update stock remaining
    stock_res = client.patch(
        f"/refills/{med_id}/stock",
        json={"stock_remaining": 60.0},
        headers=patient_auth_headers,
    )
    assert stock_res.status_code == 200
    updated_p = stock_res.json()["refill"]
    assert updated_p["stock_remaining"] == 60.0
    assert updated_p["days_remaining"] == 30.0
    assert updated_p["status"] == "ok"
