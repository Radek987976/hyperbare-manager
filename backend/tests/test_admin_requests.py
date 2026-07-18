"""Tests for admin requests dashboard (iteration 20)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@hypermaint.fr", "password": "admin123"}
TECH = {"email": "tech@hypermaint.fr", "password": "tech12345"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def tech_email():
    """Existing approved technician email for reset test."""
    # Ensure tech user exists with known password; if not, seeded already
    return TECH["email"]


class TestAdminRequestsEndpoint:
    def test_requires_admin(self):
        r = requests.get(f"{API}/dashboard/admin-requests", timeout=15)
        assert r.status_code in (401, 403)

    def test_admin_can_access(self, admin_headers):
        r = requests.get(f"{API}/dashboard/admin-requests", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert set(["total", "inscriptions", "reset_mdp", "irregularites"]).issubset(data.keys())
        assert isinstance(data["inscriptions"], list)
        assert isinstance(data["reset_mdp"], list)
        assert isinstance(data["irregularites"], list)
        assert data["total"] == len(data["inscriptions"]) + len(data["reset_mdp"]) + len(data["irregularites"])

    def test_non_admin_forbidden(self):
        # Login tech
        r = requests.post(f"{API}/auth/login", json=TECH, timeout=15)
        if r.status_code != 200:
            pytest.skip(f"tech login failed ({r.status_code}), maybe password changed")
        tok = r.json().get("access_token")
        assert tok
        r2 = requests.get(
            f"{API}/dashboard/admin-requests",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=15,
        )
        assert r2.status_code == 403


class TestRegisterApproveFlow:
    _created_user_id = None
    _created_email = None

    def test_register_creates_pending_user(self, admin_headers):
        email = f"TEST_pending_{uuid.uuid4().hex[:8]}@example.com"
        TestRegisterApproveFlow._created_email = email
        payload = {
            "nom": "Testeur",
            "prenom": "Auto",
            "email": email,
            "password": "TestPass123!",
            "role": "technicien",
        }
        r = requests.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text}"

        # Verify in admin-requests list
        r2 = requests.get(f"{API}/dashboard/admin-requests", headers=admin_headers, timeout=15)
        assert r2.status_code == 200
        inscs = r2.json()["inscriptions"]
        match = [u for u in inscs if u["email"] == email]
        assert len(match) == 1, f"created user not in inscriptions"
        assert match[0].get("is_approved") in (False, None)
        TestRegisterApproveFlow._created_user_id = match[0]["id"]

    def test_approve_removes_from_list(self, admin_headers):
        uid = TestRegisterApproveFlow._created_user_id
        assert uid, "prev test must create user"
        r = requests.put(f"{API}/users/{uid}/approve", headers=admin_headers, timeout=15)
        assert r.status_code == 200, f"approve failed: {r.status_code} {r.text}"

        r2 = requests.get(f"{API}/dashboard/admin-requests", headers=admin_headers, timeout=15)
        assert r2.status_code == 200
        inscs = r2.json()["inscriptions"]
        assert not any(u["id"] == uid for u in inscs), "user still pending after approve"

    def test_cleanup_created_user(self, admin_headers):
        uid = TestRegisterApproveFlow._created_user_id
        if not uid:
            return
        # Try admin delete endpoint
        r = requests.delete(f"{API}/users/{uid}", headers=admin_headers, timeout=15)
        # accept 200/204/404
        assert r.status_code in (200, 204, 404), f"cleanup delete: {r.status_code} {r.text}"


class TestPasswordResetFlow:
    _reset_req_id = None

    def test_forgot_password_creates_request(self, admin_headers, tech_email):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": tech_email}, timeout=15)
        assert r.status_code == 200, f"forgot-password failed: {r.status_code} {r.text}"

        r2 = requests.get(f"{API}/dashboard/admin-requests", headers=admin_headers, timeout=15)
        assert r2.status_code == 200
        resets = r2.json()["reset_mdp"]
        match = [x for x in resets if x.get("email") == tech_email]
        assert len(match) >= 1, "reset request not found for tech email"
        TestPasswordResetFlow._reset_req_id = match[0]["id"]

    def test_send_temp_password(self, admin_headers, tech_email):
        # find user id for tech
        r_users = requests.get(f"{API}/users", headers=admin_headers, timeout=15)
        assert r_users.status_code == 200
        tech = next((u for u in r_users.json() if u["email"] == tech_email), None)
        assert tech, "tech user not found"

        r = requests.post(
            f"{API}/users/{tech['id']}/send-temp-password",
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200, f"send-temp-password failed: {r.status_code} {r.text}"

        # Verify pending reset request removed for this user
        r2 = requests.get(f"{API}/dashboard/admin-requests", headers=admin_headers, timeout=15)
        assert r2.status_code == 200
        remaining = [x for x in r2.json()["reset_mdp"] if x.get("email") == tech_email]
        assert len(remaining) == 0, "pending reset still present after send-temp-password"

    def test_cleanup_reset_tech_password(self, admin_headers, tech_email):
        """Reset tech password back to tech12345 for future tests."""
        r_users = requests.get(f"{API}/users", headers=admin_headers, timeout=15)
        tech = next((u for u in r_users.json() if u["email"] == tech_email), None)
        if not tech:
            return
        # Try admin password change endpoint - endpoint may vary
        for path in [f"/users/{tech['id']}/password", f"/users/{tech['id']}/change-password"]:
            r = requests.put(
                f"{API}{path}",
                headers=admin_headers,
                json={"new_password": TECH["password"]},
                timeout=15,
            )
            if r.status_code in (200, 204):
                return
        # non-fatal
