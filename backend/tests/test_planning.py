"""Tests for planning endpoints: /api/planning/events, /api/planning/summary,
POST /api/planning/reschedule, POST /api/work-orders/{id}/complete"""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://chamber-maintenance.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@hypermaint.fr"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"] if "access_token" in r.json() else r.json().get("token")


@pytest.fixture(scope="session")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


class TestPlanningEndpoints:
    def test_events_range(self, client):
        r = client.get(f"{BASE_URL}/api/planning/events", params={"start": "2026-01-01", "end": "2026-12-31"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        if data:
            ev = data[0]
            for k in ("id", "item_type", "origine", "titre", "date", "statut", "is_overdue"):
                assert k in ev, f"missing key {k} in event"
            assert ev["item_type"] in ("work_order", "inspection")
            assert ev["origine"] in ("preventive", "corrective", "reglementaire")

    def test_events_invalid_date(self, client):
        r = client.get(f"{BASE_URL}/api/planning/events", params={"start": "invalid", "end": "2026-12-31"}, timeout=30)
        assert r.status_code == 400

    def test_summary_year(self, client):
        r = client.get(f"{BASE_URL}/api/planning/summary", params={"year": 2026}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["year"] == 2026
        assert "months" in data
        # 12 month keys (JSON keys are strings)
        keys = list(data["months"].keys())
        assert len(keys) == 12
        for k in keys:
            m = data["months"][k]
            assert "preventive" in m and "reglementaire" in m and "overdue" in m

    def test_reschedule_invalid_type(self, client):
        r = client.post(f"{BASE_URL}/api/planning/reschedule",
                        json={"item_type": "xxx", "item_id": "abc", "new_date": "2026-07-01"}, timeout=30)
        assert r.status_code == 400

    def test_reschedule_invalid_date(self, client):
        r = client.post(f"{BASE_URL}/api/planning/reschedule",
                        json={"item_type": "work_order", "item_id": "abc", "new_date": "not-a-date"}, timeout=30)
        assert r.status_code == 400

    def test_reschedule_not_found(self, client):
        r = client.post(f"{BASE_URL}/api/planning/reschedule",
                        json={"item_type": "work_order", "item_id": "nonexistent-id", "new_date": "2026-07-01"}, timeout=30)
        assert r.status_code == 404


class TestRescheduleWorkOrder:
    def test_reschedule_persists(self, client):
        # Find a planned work order
        r = client.get(f"{BASE_URL}/api/work-orders", timeout=30)
        assert r.status_code == 200
        wos = r.json()
        planned = [w for w in wos if w.get("statut") == "planifiee" and w.get("date_planifiee")]
        if not planned:
            pytest.skip("No planned work orders available")
        wo = planned[0]
        original_date = wo["date_planifiee"]
        # Move +5 days
        try:
            new = (datetime.strptime(original_date, "%Y-%m-%d") + timedelta(days=5)).strftime("%Y-%m-%d")
        except Exception:
            new = "2026-08-15"

        r = client.post(f"{BASE_URL}/api/planning/reschedule",
                        json={"item_type": "work_order", "item_id": wo["id"], "new_date": new}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("new_date") == new

        # Verify GET reflects
        r2 = client.get(f"{BASE_URL}/api/work-orders/{wo['id']}", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["date_planifiee"] == new

        # Restore original date
        client.post(f"{BASE_URL}/api/planning/reschedule",
                    json={"item_type": "work_order", "item_id": wo["id"], "new_date": original_date}, timeout=30)


class TestCompleteWorkOrder:
    def test_complete_generates_next(self, client):
        # Find a preventive work order with periodicite_jours and statut=planifiee
        r = client.get(f"{BASE_URL}/api/work-orders", timeout=30)
        assert r.status_code == 200
        wos = r.json()
        candidates = [w for w in wos
                      if w.get("type_maintenance") == "preventive"
                      and w.get("statut") == "planifiee"
                      and w.get("periodicite_jours")]
        if not candidates:
            pytest.skip("No candidate preventive WO with periodicite_jours found")
        wo = candidates[0]
        wo_id = wo["id"]
        periodicite = int(wo["periodicite_jours"])
        date_real = "2026-01-15"

        r = client.post(f"{BASE_URL}/api/work-orders/{wo_id}/complete",
                        json={"date_realisation": date_real, "technicien": "TEST_technicien",
                              "observations": "TEST_regression_planning"}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("completed") is True
        next_wo = body.get("next_work_order")
        assert next_wo is not None, "next_work_order should be generated for preventive with periodicite_jours"
        expected_next = (datetime.strptime(date_real, "%Y-%m-%d") + timedelta(days=periodicite)).strftime("%Y-%m-%d")
        assert next_wo["date_planifiee"] == expected_next
        assert next_wo["statut"] == "planifiee"
        assert next_wo["type_maintenance"] == "preventive"
        assert next_wo.get("parent_work_order_id") == wo_id

        # Verify original is now 'terminee'
        r2 = client.get(f"{BASE_URL}/api/work-orders/{wo_id}", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["statut"] == "terminee"

        # Verify generated one exists
        r3 = client.get(f"{BASE_URL}/api/work-orders/{next_wo['id']}", timeout=30)
        assert r3.status_code == 200
        assert r3.json()["statut"] == "planifiee"

    def test_complete_not_found(self, client):
        r = client.post(f"{BASE_URL}/api/work-orders/nonexistent/complete",
                        json={"date_realisation": "2026-01-15"}, timeout=30)
        assert r.status_code == 404


class TestRegression:
    def test_work_orders_list(self, client):
        r = client.get(f"{BASE_URL}/api/work-orders", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_dashboard_stats(self, client):
        r = client.get(f"{BASE_URL}/api/dashboard/stats", timeout=30)
        assert r.status_code == 200
