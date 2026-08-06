import pytest
from services.ocr import PrescriptionParser


def test_prescription_parser_known_medicines():
    parser = PrescriptionParser()
    sample_text = """
    Rx Prescription
    Patient: John Smith
    1. Metformin 500mg - Take twice daily - Qty 60
    2. Amlodipine 5mg - Take once daily - Qty 30
    """
    medicines = parser.parse(sample_text)
    assert len(medicines) >= 2
    names = [m["name"] for m in medicines]
    assert "Metformin" in names
    assert "Amlodipine" in names

    metformin = next(m for m in medicines if m["name"] == "Metformin")
    assert metformin["dosage"] == "500"
    assert metformin["dosage_unit"] == "mg"
    assert metformin["disease_category"] == "Diabetes"
    assert metformin["frequency"] == "twice daily"
    assert len(metformin["schedules"]) == 2


def test_ocr_parse_text_endpoint(client, patient_auth_headers):
    payload = {"text": "Patient needs Lisinopril 10mg once daily for BP."}
    response = client.post("/ocr/parse-text", json=payload, headers=patient_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    assert data["medicines"][0]["name"] == "Lisinopril"
    assert data["medicines"][0]["disease_category"] == "Blood Pressure"


def test_ocr_save_extracted_endpoint(client, patient_auth_headers):
    payload = {
        "medicines": [
            {
                "name": "Atorvastatin",
                "dosage": "20",
                "dosage_unit": "mg",
                "medicine_type": "Tablet",
                "disease_category": "Heart Medications",
                "instructions": "Take at bedtime",
                "quantity": 30,
                "quantity_per_dose": 1,
                "schedules": [{"reminder_time": "21:00"}],
            }
        ]
    }
    response = client.post("/ocr/save", json=payload, headers=patient_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Saved 1 medicine(s)"
    assert len(data["medicines"]) == 1
    assert data["medicines"][0]["name"] == "Atorvastatin"
