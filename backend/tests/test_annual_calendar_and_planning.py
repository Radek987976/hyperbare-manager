"""
Tests for iteration 30:
  - GET /api/reports/pdf/planning must return a non-empty PDF listing upcoming maintenances (timezone bug fix)
  - CRUD /api/admin/annual-calendar-rules (list/create/update/delete/reset)
  - POST /api/admin/apply-annual-calendar?apply=false (dry-run only) reflects DB rules
IMPORTANT: never call apply=true. Always leave rules restored to defaults at end.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@hypermaint.fr"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
               timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module", autouse=True)
def restore_defaults(admin_session):
    yield
    # Teardown: restore defaults
    try:
        admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules/reset-defaults", timeout=15)
    except Exception:
        pass


# ---------- 52-week planning PDF ----------

class TestPlanningPDF:
    def test_pdf_planning_not_empty(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/reports/pdf/planning", timeout=60)
        assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
        assert r.headers.get("content-type", "").startswith("application/pdf"), \
            f"Not a PDF: {r.headers.get('content-type')}"
        assert r.content[:4] == b"%PDF", "Response is not a valid PDF"
        # Bug fix requirement: must not be the tiny 'Aucune maintenance planifiée' PDF
        assert len(r.content) > 4000, f"PDF too small ({len(r.content)} bytes) — likely empty planning"
        # Extract raw text-ish content and ensure it does NOT contain empty message alone
        blob = r.content.decode("latin-1", errors="ignore")
        assert "Aucune maintenance" not in blob or len(r.content) > 8000, \
            "PDF contains only the empty-planning message"


# ---------- Annual calendar rules CRUD ----------

class TestCalendarRulesCRUD:
    def test_list_seeds_defaults(self, admin_session):
        # First reset to force known state, then GET returns 7 defaults
        r = admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules/reset-defaults", timeout=15)
        assert r.status_code == 200

        r = admin_session.get(f"{BASE_URL}/api/admin/annual-calendar-rules", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "rules" in data and "months" in data
        rules = data["rules"]
        assert len(rules) == 7, f"Expected 7 default rules, got {len(rules)}"
        # ordered by 'ordre' ascending
        ordres = [r_.get("ordre", 0) for r_ in rules]
        assert ordres == sorted(ordres), f"Rules not ordered by 'ordre': {ordres}"
        # months mapping present
        assert isinstance(data["months"], dict) or isinstance(data["months"], list)

    def test_create_update_delete_rule(self, admin_session):
        # CREATE
        payload = {"match_field": "reference", "match_value": "TESTZZ_", "month": 3, "label": "TEST_rule"}
        r = admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["match_field"] == "reference"
        assert created["match_value"] == "TESTZZ_"
        assert created["month"] == 3
        assert "id" in created
        rid = created["id"]

        # Verify persisted via GET
        r = admin_session.get(f"{BASE_URL}/api/admin/annual-calendar-rules", timeout=15)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()["rules"]]
        assert rid in ids

        # UPDATE month
        r = admin_session.put(f"{BASE_URL}/api/admin/annual-calendar-rules/{rid}",
                              json={"month": 9}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["month"] == 9

        # Verify update persisted
        r = admin_session.get(f"{BASE_URL}/api/admin/annual-calendar-rules", timeout=15)
        rule = next((x for x in r.json()["rules"] if x["id"] == rid), None)
        assert rule and rule["month"] == 9

        # DELETE
        r = admin_session.delete(f"{BASE_URL}/api/admin/annual-calendar-rules/{rid}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("success") is True

        r = admin_session.get(f"{BASE_URL}/api/admin/annual-calendar-rules", timeout=15)
        ids = [x["id"] for x in r.json()["rules"]]
        assert rid not in ids

    def test_validation_errors(self, admin_session):
        # invalid match_field
        r = admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules",
                               json={"match_field": "bogus", "match_value": "X", "month": 3}, timeout=15)
        assert r.status_code == 400, r.text

        # month out of range
        r = admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules",
                               json={"match_field": "reference", "match_value": "X", "month": 13}, timeout=15)
        assert r.status_code == 400

        r = admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules",
                               json={"match_field": "reference", "match_value": "X", "month": 0}, timeout=15)
        assert r.status_code == 400

        # empty match_value
        r = admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules",
                               json={"match_field": "reference", "match_value": "   ", "month": 3}, timeout=15)
        assert r.status_code == 400

    def test_reset_defaults_restores_7(self, admin_session):
        # Add a rule then reset
        admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules",
                           json={"match_field": "titre", "match_value": "TESTXX", "month": 4}, timeout=15)
        r = admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules/reset-defaults", timeout=15)
        assert r.status_code == 200
        rules = r.json()["rules"]
        assert len(rules) == 7
        assert all("TESTXX" not in (x.get("match_value") or "") for x in rules)


# ---------- Apply annual calendar (dry-run only) ----------

class TestApplyAnnualCalendar:
    def test_dry_run_uses_db_rules(self, admin_session):
        # Ensure defaults
        admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules/reset-defaults", timeout=15)

        # Baseline dry-run
        r = admin_session.post(f"{BASE_URL}/api/admin/apply-annual-calendar?apply=false", timeout=60)
        assert r.status_code == 200, r.text
        base = r.json()
        assert base["applied"] is False
        assert "changed" in base and "by_month" in base and "examples" in base
        # changed count is >= 0 (may be zero if already anchored). We still verify structure.

        # Grab a COMP rule and change its month from 2 -> 10 to observe distribution shift
        rules = admin_session.get(f"{BASE_URL}/api/admin/annual-calendar-rules", timeout=15).json()["rules"]
        comp_rule = next((x for x in rules if x["match_field"] == "reference" and x["match_value"] == "COMP"), None)
        assert comp_rule is not None, "Default COMP rule missing"

        upd = admin_session.put(f"{BASE_URL}/api/admin/annual-calendar-rules/{comp_rule['id']}",
                                json={"month": 10}, timeout=15)
        assert upd.status_code == 200

        r2 = admin_session.post(f"{BASE_URL}/api/admin/apply-annual-calendar?apply=false", timeout=60)
        assert r2.status_code == 200
        after = r2.json()
        # by_month keys are French month names — 'Octobre' should now appear if compresseurs exist
        assert isinstance(after["by_month"], dict)
        # Not strictly guaranteed but strong signal: distribution differs
        assert after != base or after["changed"] == 0, "Rule change had no effect on dry-run output"

        # Restore
        admin_session.post(f"{BASE_URL}/api/admin/annual-calendar-rules/reset-defaults", timeout=15)
