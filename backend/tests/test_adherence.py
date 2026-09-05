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


def test_taken_and_skipped_create_notifications(client, patient_auth_headers, test_patient, db_session):
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

    assert client.post(f"/reminders/{h1.id}/taken", headers=patient_auth_headers).status_code == 200
    assert client.post(f"/reminders/{h2.id}/skipped", headers=patient_auth_headers).status_code == 200

    notif_res = client.get("/notifications", headers=patient_auth_headers)
    assert notif_res.status_code == 200
    items = notif_res.json()["notifications"]
    titles = {n["title"] for n in items}
    assert "Dose Taken" in titles
    assert "Dose Skipped" in titles


def test_history_search_and_sort(client, patient_auth_headers, test_patient, db_session):
    med_a = Medicine(user_id=test_patient.id, name="Aspirin", dosage="100mg", is_active=True)
    med_b = Medicine(user_id=test_patient.id, name="Metformin", dosage="500mg", is_active=True)
    db_session.add_all([med_a, med_b])
    db_session.commit()
    db_session.refresh(med_a)
    db_session.refresh(med_b)

    now = datetime.utcnow()
    records = [
        MedicationHistory(
            user_id=test_patient.id,
            medicine_id=med_a.id,
            scheduled_datetime=now - timedelta(hours=3),
            status="taken",
        ),
        MedicationHistory(
            user_id=test_patient.id,
            medicine_id=med_b.id,
            scheduled_datetime=now - timedelta(hours=2),
            status="taken",
        ),
    ]
    db_session.add_all(records)
    db_session.commit()

    # Search narrows to the matching medicine only
    search_res = client.get("/reminders/history?q=aspirin", headers=patient_auth_headers)
    assert search_res.status_code == 200
    names = {r["medicine_name"] for r in search_res.json()}
    assert names == {"Aspirin"}

    # Ascending sort returns earliest scheduled first
    asc_res = client.get("/reminders/history?sort=asc", headers=patient_auth_headers)
    assert asc_res.status_code == 200
    rows = asc_res.json()
    assert rows[0]["medicine_name"] == "Aspirin"


def test_snooze_reminder(client, patient_auth_headers, test_patient, db_session):
    med = Medicine(
        user_id=test_patient.id,
        name="Aspirin",
        dosage="100mg",
        is_active=True,
    )
    db_session.add(med)
    db_session.commit()
    db_session.refresh(med)

    h = MedicationHistory(
        user_id=test_patient.id,
        medicine_id=med.id,
        scheduled_datetime=datetime.utcnow() - timedelta(hours=1),
        status="pending",
    )
    db_session.add(h)
    db_session.commit()
    db_session.refresh(h)

    res = client.post(f"/reminders/{h.id}/snoozed", json={"minutes": 10}, headers=patient_auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "pending"
    assert res.json()["snoozed_until"] is not None

    # Invalid snooze minutes fall back to the default (10)
    res2 = client.post(f"/reminders/{h.id}/snoozed", json={"minutes": 7}, headers=patient_auth_headers)
    assert res2.status_code == 200
    assert res2.json()["snoozed_until"] is not None
