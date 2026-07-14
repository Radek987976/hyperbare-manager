"""Tests for equipment/subequipment maintenance history endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chamber-maintenance.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@hypermaint.fr", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def equipments(headers):
    r = requests.get(f"{BASE_URL}/api/equipments", headers=headers)
    assert r.status_code == 200
    return r.json()


def test_equipments_list_not_empty(equipments):
    assert isinstance(equipments, list) and len(equipments) > 0


def test_history_bauer01(equipments, headers):
    bauer = next((e for e in equipments if 'BAUER 01' in (e.get('reference') or '').upper()), None)
    assert bauer is not None, "BAUER 01 not found"
    r = requests.get(f"{BASE_URL}/api/equipments/{bauer['id']}/history", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert 'historique' in data and 'futures' in data
    assert isinstance(data['historique'], list)
    assert isinstance(data['futures'], list)
    # BAUER 01 expected ~25 futures per prompt
    assert len(data['futures']) >= 5, f"Expected >=5 futures for BAUER 01, got {len(data['futures'])}"
    # Verify structure of a future item
    ev = data['futures'][0]
    for key in ('source', 'type', 'titre', 'date', 'statut', 'is_overdue'):
        assert key in ev, f"missing key {key} in future event: {ev}"


def test_history_generic_equipment(equipments, headers):
    # Test a non-compresseur equipment: history endpoint should still return 200 with empty arrays maybe
    other = next((e for e in equipments if 'BAUER' not in (e.get('reference') or '').upper()
                  and 'W300' not in (e.get('reference') or '').upper()
                  and 'LUCHARD' not in (e.get('reference') or '').upper()), None)
    if not other:
        pytest.skip("No non-compresseur non-cuve equipment found")
    r = requests.get(f"{BASE_URL}/api/equipments/{other['id']}/history", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert 'historique' in data and 'futures' in data


def test_history_equipment_not_found(headers):
    r = requests.get(f"{BASE_URL}/api/equipments/nonexistent-id/history", headers=headers)
    # Either 404 or 200 with empty arrays -- both acceptable but should not 500
    assert r.status_code in (200, 404)


def test_subequipment_history(headers):
    r = requests.get(f"{BASE_URL}/api/subequipments", headers=headers)
    assert r.status_code == 200
    subs = r.json()
    if not subs:
        pytest.skip("No subequipments in DB")
    r2 = requests.get(f"{BASE_URL}/api/subequipments/{subs[0]['id']}/history", headers=headers)
    assert r2.status_code == 200, r2.text
    data = r2.json()
    assert 'historique' in data and 'futures' in data
    assert isinstance(data['historique'], list) and isinstance(data['futures'], list)


def test_subequipment_history_invalid_id(headers):
    r = requests.get(f"{BASE_URL}/api/subequipments/nonexistent-id/history", headers=headers)
    assert r.status_code in (200, 404)


def test_equipment_detail_regression(equipments, headers):
    """Ensure equipment detail endpoint still works."""
    eq = equipments[0]
    r = requests.get(f"{BASE_URL}/api/equipments/{eq['id']}", headers=headers)
    assert r.status_code == 200
    data = r.json()
    for k in ('id', 'reference', 'type'):
        assert k in data


def test_dashboard_regression(headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
    assert r.status_code == 200


def test_planning_regression(headers):
    r = requests.get(f"{BASE_URL}/api/planning/events", headers=headers, params={"start": "2026-01-01", "end": "2026-01-31"})
    assert r.status_code == 200
