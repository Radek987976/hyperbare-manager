"""Tests for the inspection renew endpoint (POST /api/inspections/{id}/renew)."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://chamber-maintenance.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@hypermaint.fr"
ADMIN_PWD = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def inspection_id(headers):
    # Create an EXPIRED inspection (old date + mensuel = 30d)
    old_date = (date.today() - timedelta(days=90)).isoformat()
    payload = {
        "titre": "TEST_Renew_Inspection",
        "type_controle": "TEST_type",
        "periodicite": "mensuel",
        "date_realisation": old_date,
        "resultat": "conforme",
        "organisme_certificateur": "TEST Org",
        "observations": "initial",
    }
    r = requests.post(f"{BASE_URL}/api/inspections", json=payload, headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["date_validite"] < date.today().isoformat(), "Should be expired"
    yield data["id"]
    # cleanup
    requests.delete(f"{BASE_URL}/api/inspections/{data['id']}", headers=headers)


def test_renew_archives_history_and_updates_dates(headers, inspection_id):
    today = date.today().isoformat()
    payload = {
        "date_realisation": today,
        "resultat": "conforme",
        "organisme_certificateur": "TEST New Org",
        "observations": "renouvelé",
    }
    r = requests.post(f"{BASE_URL}/api/inspections/{inspection_id}/renew", json=payload, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["date_realisation"] == today
    # date_validite should be today + 30 days (mensuel)
    expected = (date.today() + timedelta(days=30)).isoformat()
    assert body["date_validite"] == expected
    assert body["date_validite"] > date.today().isoformat(), "Should be in the future (non expired)"
    assert isinstance(body.get("historique_controles"), list)
    assert len(body["historique_controles"]) == 1
    hist = body["historique_controles"][0]
    assert hist["organisme_certificateur"] == "TEST Org"
    assert "archived_at" in hist


def test_get_returns_persisted_history(headers, inspection_id):
    r = requests.get(f"{BASE_URL}/api/inspections/{inspection_id}", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body.get("historique_controles", [])) == 1
    assert body["date_validite"] > date.today().isoformat()


def test_second_renew_appends_history(headers, inspection_id):
    today = date.today().isoformat()
    r = requests.post(f"{BASE_URL}/api/inspections/{inspection_id}/renew",
                      json={"date_realisation": today, "resultat": "conforme"},
                      headers=headers)
    assert r.status_code == 200
    assert len(r.json()["historique_controles"]) == 2


def test_update_does_not_wipe_history(headers, inspection_id):
    # PUT full object - historique should be preserved by backend
    get_r = requests.get(f"{BASE_URL}/api/inspections/{inspection_id}", headers=headers)
    body = get_r.json()
    payload = {k: body.get(k) for k in ["titre", "type_controle", "periodicite", "caisson_id", "equipment_id",
                                         "date_realisation", "organisme_certificateur", "resultat", "observations"]}
    payload["observations"] = "edited"
    r = requests.put(f"{BASE_URL}/api/inspections/{inspection_id}", json=payload, headers=headers)
    assert r.status_code == 200
    assert len(r.json().get("historique_controles", [])) >= 2, "History must persist through PUT"


def test_renew_nonexistent_returns_404(headers):
    r = requests.post(f"{BASE_URL}/api/inspections/does-not-exist/renew",
                      json={"date_realisation": date.today().isoformat()}, headers=headers)
    assert r.status_code == 404
