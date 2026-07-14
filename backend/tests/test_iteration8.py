"""Iteration 8 tests - Tasks 1-4:
1. Extincteurs & ARI equipments + 100% work_orders linked
2. Equipment PDF documents (existing feature confirmation)
3. Planning filter by equipment_id
4. Equipment fiche PDF export
"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://chamber-maintenance.preview.emergentagent.com").rstrip("/")
ADMIN = {"email": "admin@hypermaint.fr", "password": "admin123"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def equipments(headers):
    r = requests.get(f"{BASE_URL}/api/equipments", headers=headers, timeout=30)
    assert r.status_code == 200
    return r.json()


# ---------- TASK 1 ----------
class TestTask1EquipmentsAndLinks:
    def test_equipments_list_contains_extincteurs_and_ari(self, equipments):
        names = []
        for e in equipments:
            names.append((e.get("nom") or "") + "|" + (e.get("reference") or ""))
        joined = " ".join(names).lower()
        assert "extincteur" in joined, f"Extincteurs not found. Equipments: {names}"
        assert "ari" in joined, f"ARI not found. Equipments: {names}"

    def test_equipments_count_around_16(self, equipments):
        assert len(equipments) >= 10, f"Expected ~16 equipments, got {len(equipments)}"

    def test_all_work_orders_have_equipment_id(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/planning/events",
            params={"start": "2026-01-01", "end": "2027-12-31"},
            headers=headers,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        events = r.json()
        assert len(events) > 0, "No events found"
        missing = [e for e in events if not e.get("equipment_id")]
        assert len(missing) == 0, f"{len(missing)} work orders without equipment_id"

    def test_extincteurs_has_upcoming_maintenances(self, headers, equipments):
        ext = next((e for e in equipments if "extincteur" in ((e.get("nom") or "") + (e.get("reference") or "")).lower()), None)
        assert ext, "Extincteurs equipment not found"
        r = requests.get(
            f"{BASE_URL}/api/planning/events",
            params={"start": "2026-01-01", "end": "2027-12-31", "equipment_id": ext["id"]},
            headers=headers,
            timeout=30,
        )
        assert r.status_code == 200
        assert len(r.json()) > 0, "Extincteurs has no upcoming maintenances"

    def test_ari_has_upcoming_maintenances(self, headers, equipments):
        ari = next((e for e in equipments if "ari (parc)" in ((e.get("nom") or "") + (e.get("reference") or "")).lower()), None)
        assert ari, "ARI (parc) equipment not found"
        r = requests.get(
            f"{BASE_URL}/api/planning/events",
            params={"start": "2026-01-01", "end": "2027-12-31", "equipment_id": ari["id"]},
            headers=headers,
            timeout=30,
        )
        assert r.status_code == 200
        assert len(r.json()) > 0, "ARI has no upcoming maintenances"


# ---------- TASK 2 ----------
class TestTask2EquipmentDocuments:
    def test_upload_and_delete_pdf(self, headers, equipments):
        eq = equipments[0]
        eq_id = eq["id"]
        pdf_bytes = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
        files = {"file": ("TEST_iter8.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        r = requests.post(
            f"{BASE_URL}/api/equipments/{eq_id}/documents",
            headers=headers,
            files=files,
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        data = r.json()
        # response may contain url or document object
        doc_url = data.get("url") or (data.get("document") or {}).get("url")
        if not doc_url:
            # fetch equipment to find newly added doc
            r2 = requests.get(f"{BASE_URL}/api/equipments/{eq_id}", headers=headers, timeout=30)
            docs = r2.json().get("documents", []) or r2.json().get("pdf_documents", [])
            assert docs, "No documents after upload"
            doc_url = docs[-1].get("url")
        assert doc_url

        # delete
        r3 = requests.delete(
            f"{BASE_URL}/api/equipments/{eq_id}/documents",
            headers=headers,
            params={"doc_url": doc_url},
            timeout=30,
        )
        assert r3.status_code in (200, 204), r3.text


# ---------- TASK 3 ----------
class TestTask3PlanningFilter:
    def test_events_filter_by_equipment(self, headers, equipments):
        bauer = next((e for e in equipments if "bauer 01" in ((e.get("nom") or "") + (e.get("reference") or "")).lower()), None)
        assert bauer, "BAUER 01 not found"
        r_all = requests.get(
            f"{BASE_URL}/api/planning/events",
            params={"start": "2026-01-01", "end": "2027-12-31"},
            headers=headers,
            timeout=30,
        )
        r_filt = requests.get(
            f"{BASE_URL}/api/planning/events",
            params={"start": "2026-01-01", "end": "2027-12-31", "equipment_id": bauer["id"]},
            headers=headers,
            timeout=30,
        )
        assert r_all.status_code == 200 and r_filt.status_code == 200
        all_events = r_all.json()
        filt = r_filt.json()
        assert len(filt) > 0
        assert len(filt) < len(all_events)
        assert all(e.get("equipment_id") == bauer["id"] for e in filt)

    def test_summary_filter_by_equipment(self, headers, equipments):
        bauer = next((e for e in equipments if "bauer 01" in ((e.get("nom") or "") + (e.get("reference") or "")).lower()), None)
        assert bauer
        r = requests.get(
            f"{BASE_URL}/api/planning/summary",
            params={"year": 2026, "equipment_id": bauer["id"]},
            headers=headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data is not None


# ---------- TASK 4 ----------
class TestTask4EquipmentPDFExport:
    def test_download_equipment_pdf(self, headers, equipments):
        eq_id = equipments[0]["id"]
        r = requests.get(
            f"{BASE_URL}/api/reports/pdf/equipment/{eq_id}",
            headers=headers,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        assert "application/pdf" in r.headers.get("content-type", "").lower()
        assert len(r.content) > 500
        assert r.content[:4] == b"%PDF"
