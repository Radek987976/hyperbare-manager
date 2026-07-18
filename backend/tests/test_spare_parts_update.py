"""Tests for spare parts PUT update — bug fix: equipment_type/nom/reference_fabricant must persist."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://chamber-maintenance.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@hypermaint.fr", "password": "admin123"},
                      timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def equipment_types(headers):
    r = requests.get(f"{BASE_URL}/api/equipment-types", headers=headers, timeout=15)
    assert r.status_code == 200
    types = [t["nom"] for t in r.json()]
    assert len(types) >= 2, f"Need at least 2 equipment types, got {types}"
    return types


def test_create_update_spare_part_equipment_type(headers, equipment_types):
    initial_type = equipment_types[0]
    new_type = equipment_types[1]
    unique = uuid.uuid4().hex[:8]

    # CREATE
    payload = {
        "nom": f"TEST_piece_{unique}",
        "reference_fabricant": f"TEST_REF_{unique}",
        "equipment_type": initial_type,
        "quantite_stock": 10,
        "seuil_minimum": 2,
    }
    r = requests.post(f"{BASE_URL}/api/spare-parts", headers=headers, json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    created = r.json()
    part_id = created["id"]
    assert created["equipment_type"] == initial_type
    assert created["nom"] == payload["nom"]
    assert created["reference_fabricant"] == payload["reference_fabricant"]

    try:
        # UPDATE equipment_type + nom + reference_fabricant
        new_nom = f"TEST_piece_updated_{unique}"
        new_ref = f"TEST_REF_UPDATED_{unique}"
        upd = {
            "equipment_type": new_type,
            "nom": new_nom,
            "reference_fabricant": new_ref,
            "quantite_stock": 15,
            "seuil_minimum": 3,
        }
        r = requests.put(f"{BASE_URL}/api/spare-parts/{part_id}", headers=headers, json=upd, timeout=15)
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["equipment_type"] == new_type, f"equipment_type NOT persisted: {updated}"
        assert updated["nom"] == new_nom
        assert updated["reference_fabricant"] == new_ref
        assert updated["quantite_stock"] == 15
        assert updated["seuil_minimum"] == 3

        # GET to double-check persistence in DB
        r = requests.get(f"{BASE_URL}/api/spare-parts", headers=headers, timeout=15)
        assert r.status_code == 200
        parts = r.json()
        got = next((p for p in parts if p["id"] == part_id), None)
        assert got is not None, "Created part not found in list"
        assert got["equipment_type"] == new_type, f"equipment_type not persisted after GET: {got}"
        assert got["nom"] == new_nom
        assert got["reference_fabricant"] == new_ref
        assert got["quantite_stock"] == 15
    finally:
        # CLEANUP
        requests.delete(f"{BASE_URL}/api/spare-parts/{part_id}", headers=headers, timeout=15)


def test_update_only_stock(headers, equipment_types):
    """Regression: updating stock should not lose other fields."""
    unique = uuid.uuid4().hex[:8]
    payload = {
        "nom": f"TEST_stock_{unique}",
        "reference_fabricant": f"TEST_STK_{unique}",
        "equipment_type": equipment_types[0],
        "quantite_stock": 5,
        "seuil_minimum": 1,
    }
    r = requests.post(f"{BASE_URL}/api/spare-parts", headers=headers, json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    part_id = r.json()["id"]
    try:
        r = requests.put(f"{BASE_URL}/api/spare-parts/{part_id}", headers=headers,
                         json={"quantite_stock": 42, "seuil_minimum": 7}, timeout=15)
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["quantite_stock"] == 42
        assert updated["seuil_minimum"] == 7
        # unchanged fields still there
        assert updated["nom"] == payload["nom"]
        assert updated["equipment_type"] == equipment_types[0]
        assert updated["reference_fabricant"] == payload["reference_fabricant"]
    finally:
        requests.delete(f"{BASE_URL}/api/spare-parts/{part_id}", headers=headers, timeout=15)
