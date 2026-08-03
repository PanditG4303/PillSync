import pytest
from datetime import datetime, timedelta
from models import MedicationHistory, Medicine


def test_adherence_report_and_reminder_actions(client, patient_auth_headers, test_patient, db_session):
    # Create medicine
    med = Medicine(
        user_id=test_patient.id,
        name="Aspirin",
        dosage="100mg",
        is_active=True,
        stock_remaining=30,
        quantity_per_dose=1,
    )
    db_session.add(med)
    db_session.commit()
    db_session.refresh(med)

    # Add medication history records
    now = datetime.utcnow()
    h1 = MedicationHistory(
        user_id=test_patient.id,
        medicine_id=med.id,
        scheduled_datetime=now - timedelta(hours=2),
        status="pending",
    )
    h2 = MedicationHistory(
        user_id=test_patient.id,
        medicine_id=med.id,
        scheduled_datetime=now - timedelta(hours=1),
        status="pending",
    )
    db_session.add_all([h1, h2])
    db_session.commit()
    db_session.refresh(h1)
    db_session.refresh(h2)

    # Mark h1 as taken
    taken_res = client.post(f"/reminders/{h1.id}/taken", headers=patient_auth_headers)
    assert taken_res.status_code == 200
    assert taken_res.json()["status"] in ("taken", "late")

    # Mark h2 as skipped
    skipped_res = client.post(f"/reminders/{h2.id}/skipped", headers=patient_auth_headers)
    assert skipped_res.status_code == 200
    assert skipped_res.json()["status"] == "skipped"

    # Fetch weekly adherence report
    report_res = client.get("/reports/adherence?period=week", headers=patient_auth_headers)
    assert report_res.status_code == 200
    data = report_res.json()
    assert "stats" in data
    assert data["stats"]["taken"] >= 1
    assert data["stats"]["skipped"] >= 1
    assert "adherence" in data["stats"]
