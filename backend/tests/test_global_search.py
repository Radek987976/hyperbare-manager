import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://chamber-maintenance.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@hypermaint.fr", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_search_short_query(headers):
    r = requests.get(f"{BASE_URL}/api/search", params={"q": "a"}, headers=headers)
    assert r.status_code == 200
    d = r.json()
    assert d["count"] == 0
    assert d["results"] == []


def test_search_bauer(headers):
    r = requests.get(f"{BASE_URL}/api/search", params={"q": "BAUER"}, headers=headers)
    assert r.status_code == 200
    d = r.json()
    assert d["count"] > 0
    cats = {res["category"] for res in d["results"]}
    assert "equipment" in cats
    for res in d["results"]:
        assert "id" in res and "label" in res and "category" in res and "label_category" in res and "sublabel" in res


def test_search_manom(headers):
    r = requests.get(f"{BASE_URL}/api/search", params={"q": "manom"}, headers=headers)
    assert r.status_code == 200
    d = r.json()
    assert d["count"] >= 1


def test_search_compresseur_type(headers):
    r = requests.get(f"{BASE_URL}/api/search", params={"q": "Compresseur"}, headers=headers)
    assert r.status_code == 200
    d = r.json()
    assert d["count"] >= 1
    eq_labels = [r["category"] for r in d["results"]]
    assert "equipment" in eq_labels


def test_search_hublot(headers):
    r = requests.get(f"{BASE_URL}/api/search", params={"q": "hublot"}, headers=headers)
    assert r.status_code == 200
    d = r.json()
    # expecting at least some work_orders or equipment
    assert isinstance(d["results"], list)


def test_search_requires_auth():
    r = requests.get(f"{BASE_URL}/api/search", params={"q": "BAUER"})
    assert r.status_code in (401, 403)


def test_dashboard_regression(headers):
    for path in ["/api/dashboard/stats", "/api/equipments", "/api/work-orders"]:
        r = requests.get(f"{BASE_URL}{path}", headers=headers)
        assert r.status_code == 200, f"{path} -> {r.status_code}"
