"""Tests for maintenance data import bug fix - verify work_orders, controls, dashboard."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chamber-maintenance.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@hypermaint.fr")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "admin123")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_work_orders_preventive_count(headers):
    """248 work_orders type=preventive statut=planifiee expected."""
    r = requests.get(f"{BASE_URL}/api/work-orders", headers=headers, timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    data = r.json()
    assert isinstance(data, list)
    print(f"Total work_orders: {len(data)}")
    preventive = [w for w in data if w.get("type_maintenance") == "preventive"]
    planifiee = [w for w in preventive if w.get("statut") == "planifiee"]
    print(f"Preventive: {len(preventive)}, Planifiee: {len(planifiee)}")
    assert len(data) >= 200, f"Expected ~248 work_orders, got {len(data)}"
    assert len(preventive) >= 200, f"Expected ~248 preventive, got {len(preventive)}"


def test_controls_count(headers):
    r = requests.get(f"{BASE_URL}/api/inspections", headers=headers, timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    data = r.json()
    print(f"Total inspections/controls: {len(data)}")
    assert len(data) >= 90, f"Expected ~109 controls, got {len(data)}"


def test_dashboard_stats(headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers, timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    d = r.json()
    print(f"Dashboard stats: {d}")


def test_dashboard_alerts(headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/alerts", headers=headers, timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"


def test_dashboard_upcoming(headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/upcoming-maintenance", headers=headers, timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    print(f"Upcoming count: {len(r.json()) if isinstance(r.json(), list) else 'n/a'}")


def test_dashboard_calendar(headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/calendar", headers=headers, timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"


def test_equipments(headers):
    r = requests.get(f"{BASE_URL}/api/equipments", headers=headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    print(f"Equipments: {len(data)}")
    assert len(data) >= 5


def test_gas_bottles(headers):
    r = requests.get(f"{BASE_URL}/api/gas-cylinders", headers=headers, timeout=30)
    assert r.status_code == 200
    print(f"Gas bottles: {len(r.json())}")


def test_stock(headers):
    r = requests.get(f"{BASE_URL}/api/spare-parts", headers=headers, timeout=30)
    assert r.status_code == 200
    print(f"Spare parts: {len(r.json())}")


def test_budget(headers):
    r = requests.get(f"{BASE_URL}/api/budget?annee=2026", headers=headers, timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    data = r.json()
    print(f"Budget 2026: {len(data) if isinstance(data, list) else data}")
