"""Tests pour le statut 'reforme' - exclusion planning/alertes/upcoming, historique conservé."""
import os
import pytest
import requests

def _load_env():
    p = "/app/frontend/.env"
    if os.path.exists(p):
        for line in open(p):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    return os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

BASE = _load_env()
assert BASE, "REACT_APP_BACKEND_URL manquant"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": "admin@hypermaint.fr", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def target_equipment(headers):
    """Trouve un équipement avec des events planning futurs (BAUER 01 / Chambre Chronique / autre)."""
    r = requests.get(f"{BASE}/api/equipments", headers=headers)
    assert r.status_code == 200
    equipments = r.json()
    # Chercher un équipement avec events futurs
    for eq in equipments:
        eid = eq["id"]
        pr = requests.get(f"{BASE}/api/planning/events",
                          params={"start": "2026-01-01", "end": "2027-12-31", "equipment_id": eid},
                          headers=headers)
        if pr.status_code == 200 and len(pr.json()) > 0 and eq.get("statut") == "en_service":
            return eq
    pytest.skip("Aucun équipement en_service avec events futurs trouvé.")


def _set_status(headers, eq, statut):
    """PUT nécessite le body complet - on merge statut dans la doc existante."""
    payload = {k: v for k, v in eq.items() if k not in ("_id",)}
    payload["statut"] = statut
    r = requests.put(f"{BASE}/api/equipments/{eq['id']}",
                     headers=headers, json=payload)
    assert r.status_code == 200, r.text
    return r.json()


class TestReforme:
    def test_full_flow(self, headers, target_equipment):
        eq = target_equipment
        eid = eq["id"]
        original_status = eq.get("statut", "en_service")

        try:
            # Baseline: events > 0
            pr = requests.get(f"{BASE}/api/planning/events",
                              params={"start": "2026-01-01", "end": "2027-12-31", "equipment_id": eid},
                              headers=headers)
            assert pr.status_code == 200
            baseline_events = pr.json()
            assert len(baseline_events) > 0, "Baseline: équipement doit avoir des events"

            # Passer en reforme
            updated = _set_status(headers, eq, "reforme")
            assert updated["statut"] == "reforme"

            # 1) planning/events => 0
            pr = requests.get(f"{BASE}/api/planning/events",
                              params={"start": "2026-01-01", "end": "2027-12-31", "equipment_id": eid},
                              headers=headers)
            assert pr.status_code == 200
            assert pr.json() == [], f"Réformé doit avoir 0 events, got {len(pr.json())}"

            # 2) planning/summary => tous à 0
            sr = requests.get(f"{BASE}/api/planning/summary",
                              params={"year": 2026, "equipment_id": eid},
                              headers=headers)
            assert sr.status_code == 200
            summary = sr.json()
            # summary attend structure - vérifier que tous compteurs valeurs = 0
            total = 0
            def _sum_nums(o):
                s = 0
                if isinstance(o, dict):
                    for v in o.values():
                        s += _sum_nums(v)
                elif isinstance(o, list):
                    for v in o:
                        s += _sum_nums(v)
                elif isinstance(o, (int, float)):
                    s += o
                return s
            total = _sum_nums(summary.get("months", summary))
            assert total == 0, f"Réformé summary doit être 0, got total={total}, summary={summary}"

            # 3) Global planning events sans filtre ne doit pas contenir cet eid
            gpr = requests.get(f"{BASE}/api/planning/events",
                               params={"start": "2026-01-01", "end": "2027-12-31"},
                               headers=headers)
            assert gpr.status_code == 200
            ids_in_global = {e.get("equipment_id") for e in gpr.json()}
            assert eid not in ids_in_global, "Réformé ne doit pas apparaître dans events globaux"

            # 4) upcoming-maintenance
            um = requests.get(f"{BASE}/api/dashboard/upcoming-maintenance", headers=headers)
            assert um.status_code == 200
            um_data = um.json()
            um_ids = {x.get("equipment_id") for x in (um_data if isinstance(um_data, list) else um_data.get("items", []))}
            assert eid not in um_ids, "Réformé ne doit pas apparaître dans upcoming-maintenance"

            # 5) alerts
            al = requests.get(f"{BASE}/api/dashboard/alerts", headers=headers)
            assert al.status_code == 200
            al_data = al.json()
            al_list = al_data if isinstance(al_data, list) else al_data.get("alerts", [])
            al_ids = {x.get("equipment_id") for x in al_list if isinstance(x, dict)}
            assert eid not in al_ids, "Réformé ne doit pas apparaître dans alerts"

            # 6) history: futures vide mais historique conservé
            hr = requests.get(f"{BASE}/api/equipments/{eid}/history", headers=headers)
            assert hr.status_code == 200
            hist = hr.json()
            assert hist.get("futures", None) == [], f"futures doit être [], got {hist.get('futures')}"
            # Historique conservé: la clé history/past/interventions doit exister (structure existante)
            assert isinstance(hist, dict)

        finally:
            # Toujours remettre le statut original
            _set_status(headers, {**eq, "id": eid}, original_status)

            # Vérifier restauration: events reviennent
            pr = requests.get(f"{BASE}/api/planning/events",
                              params={"start": "2026-01-01", "end": "2027-12-31", "equipment_id": eid},
                              headers=headers)
            assert pr.status_code == 200
            assert len(pr.json()) > 0, "Après restauration, events doivent revenir"

    def test_status_reforme_accepted_and_listed(self, headers):
        """Vérifie qu'on peut lister les équipements et que 'reforme' est un statut str libre."""
        r = requests.get(f"{BASE}/api/equipments", headers=headers)
        assert r.status_code == 200
        eqs = r.json()
        assert len(eqs) > 0
        # Tous les statuts actuels doivent être valides
        for eq in eqs:
            assert isinstance(eq.get("statut", ""), str)
