from datetime import datetime

from models import UserPreference
from services.sms import build_pause_code


def test_sms_pause_endpoint_sets_preference(client, test_patient, db_session):
    code = build_pause_code(test_patient.id)

    response = client.get(f"/sms/pause?code={code}", follow_redirects=False)
    assert response.status_code == 303
    assert "/settings?tab=notifications" in response.headers["location"]

    pref = db_session.query(UserPreference).filter(UserPreference.user_id == test_patient.id).first()
    assert pref is not None
    assert pref.sms_paused_until is not None
    assert pref.sms_paused_until > datetime.utcnow()


def test_sms_pause_endpoint_rejects_bad_code(client):
    response = client.get("/sms/pause?code=invalid.code.here", follow_redirects=False)
    assert response.status_code == 400


def test_sms_paused_until_in_preferences(client, test_patient, db_session, patient_auth_headers):
    code = build_pause_code(test_patient.id)
    client.get(f"/sms/pause?code={code}", follow_redirects=False)

    listed = client.get("/settings/preferences", headers=patient_auth_headers)
    assert listed.status_code == 200
    assert listed.json()["sms_paused_until"] is not None