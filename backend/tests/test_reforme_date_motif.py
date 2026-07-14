"""Tests iteration 10: date_reforme/motif_reforme + extincteurs individuels."""
import os
import pytest
import requests

def _load_env():
    p = "/app/frontend/.env"
    for line in open(p):
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    return ""

BASE = _load_env()
assert BASE

@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": "admin@hypermaint.fr", "password": "admin123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def all_equipments(headers):
    r = requests.get(f"{BASE}/api/equipments", headers=headers)
    assert r.status_code == 200
    return r.json()


class TestReformeDateMotif:
    def test_put_reforme_persists_date_and_motif(self, headers, all_equipments):
        # Choose any en_service equipment
        eq = next((e for e in all_equipments if e.get("statut") == "en_service"), None)
        assert eq, "No en_service equipment found"
        eid = eq["id"]
        original_status = eq.get("statut")
        original_date = eq.get("date_reforme")
        original_motif = eq.get("motif_reforme")

        try:
            payload = {k: v for k, v in eq.items() if k != "_id"}
            payload["statut"] = "reforme"
            payload["date_reforme"] = "2026-06-30"
            payload["motif_reforme"] = "Obsolescence"
            r = requests.put(f"{BASE}/api/equipments/{eid}", headers=headers, json=payload)
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["statut"] == "reforme"
            assert data["date_reforme"] == "2026-06-30"
            assert data["motif_reforme"] == "Obsolescence"

            # GET verify persistence
            g = requests.get(f"{BASE}/api/equipments/{eid}", headers=headers)
            assert g.status_code == 200
            gd = g.json()
            assert gd["date_reforme"] == "2026-06-30"
            assert gd["motif_reforme"] == "Obsolescence"

            # Reset to en_service - fields must become null
            payload2 = {k: v for k, v in gd.items() if k != "_id"}
            payload2["statut"] = "en_service"
            payload2["date_reforme"] = None
            payload2["motif_reforme"] = None
            r2 = requests.put(f"{BASE}/api/equipments/{eid}", headers=headers, json=payload2)
            assert r2.status_code == 200
            d2 = r2.json()
            assert d2["statut"] == "en_service"
            assert d2.get("date_reforme") in (None, "")
            assert d2.get("motif_reforme") in (None, "")
        finally:
            # Restore original
            g = requests.get(f"{BASE}/api/equipments/{eid}", headers=headers).json()
            p = {k: v for k, v in g.items() if k != "_id"}
            p["statut"] = original_status
            p["date_reforme"] = original_date
            p["motif_reforme"] = original_motif
            requests.put(f"{BASE}/api/equipments/{eid}", headers=headers, json=p)


class TestExtincteurs:
    EXPECTED = [
        "Extincteur CX0198-0016",
        "Extincteur CX0219-0018",
        "Extincteur CX0219-0024",
        "Extincteur CX0219-0082",
    ]

    def test_four_individual_extincteurs_exist(self, all_equipments):
        names = [e.get("reference") for e in all_equipments]
        for expected in self.EXPECTED:
            assert expected in names, f"Missing extincteur: {expected}. Got: {names}"

    def test_old_parc_removed(self, all_equipments):
        names = [e.get("reference") for e in all_equipments]
        assert "Extincteurs hyperbares" not in names, "Old parc should be removed"

    def test_total_equipments_around_19(self, all_equipments):
        assert 17 <= len(all_equipments) <= 22, f"Total = {len(all_equipments)}"

    def test_each_extincteur_has_history(self, headers, all_equipments):
        extincteurs = [e for e in all_equipments if e.get("reference") in self.EXPECTED]
        assert len(extincteurs) == 4
        for eq in extincteurs:
            r = requests.get(f"{BASE}/api/equipments/{eq['id']}/history", headers=headers)
            assert r.status_code == 200
            hist = r.json()
            futures = hist.get("futures", [])
            work_orders = hist.get("work_orders", [])
            inspections = hist.get("inspections", [])
            total = len(futures) + len(work_orders) + len(inspections)
            assert total > 0, f"Extincteur {eq.get('reference')} has no maintenance data"
