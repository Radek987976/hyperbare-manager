"""Backend tests for iteration 7:
- PDF upload/delete on inspections
- Chambre Chronique/SAS/Urgence exist + history has futures
"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://chamber-maintenance.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@hypermaint.fr")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "admin123")

CHAMBRES_NAMES = ["Chambre Chronique", "Chambre SAS", "Chambre Urgence"]


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def equipments(client):
    r = client.get(f"{BASE_URL}/api/equipments")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def inspection_id(client):
    r = client.get(f"{BASE_URL}/api/inspections")
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0, "No inspections found in DB"
    return data[0]["id"]


PDF_BYTES = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>endobj\nxref\n0 4\n0000000000 65535 f\ntrailer<< /Root 1 0 R /Size 4 >>\nstartxref\n180\n%%EOF"


class TestInspectionPdf:
    uploaded_url = None

    def test_upload_pdf_ok(self, client, inspection_id):
        files = {"file": ("test_iter7.pdf", io.BytesIO(PDF_BYTES), "application/pdf")}
        r = client.post(f"{BASE_URL}/api/inspections/{inspection_id}/procedures", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["filename"] == "test_iter7.pdf"
        assert data["url"].startswith("/api/uploads/inspections/")
        TestInspectionPdf.uploaded_url = data["url"]

    def test_inspection_get_contains_doc(self, client, inspection_id):
        r = client.get(f"{BASE_URL}/api/inspections/{inspection_id}")
        assert r.status_code == 200
        docs = r.json().get("procedure_documents", [])
        urls = [d["url"] for d in docs]
        assert TestInspectionPdf.uploaded_url in urls

    def test_pdf_served(self, client):
        assert TestInspectionPdf.uploaded_url is not None
        r = client.get(f"{BASE_URL}{TestInspectionPdf.uploaded_url}")
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "pdf" in ct.lower(), f"unexpected content-type: {ct}"

    def test_reject_non_pdf(self, client, inspection_id):
        files = {"file": ("bad.txt", io.BytesIO(b"hello"), "text/plain")}
        r = client.post(f"{BASE_URL}/api/inspections/{inspection_id}/procedures", files=files)
        assert r.status_code == 400

    def test_delete_pdf(self, client, inspection_id):
        assert TestInspectionPdf.uploaded_url is not None
        r = client.delete(
            f"{BASE_URL}/api/inspections/{inspection_id}/procedures",
            params={"doc_url": TestInspectionPdf.uploaded_url},
        )
        assert r.status_code == 200
        # verify removed
        r = client.get(f"{BASE_URL}/api/inspections/{inspection_id}")
        urls = [d["url"] for d in r.json().get("procedure_documents", [])]
        assert TestInspectionPdf.uploaded_url not in urls


class TestChambres:
    @pytest.mark.parametrize("name", CHAMBRES_NAMES)
    def test_chambre_exists(self, equipments, name):
        match = [e for e in equipments if (e.get("nom") or e.get("reference")) == name]
        assert len(match) >= 1, f"{name} not found in equipments"
        assert match[0].get("type") == "Chambre hyperbare"

    @pytest.mark.parametrize("name", CHAMBRES_NAMES)
    def test_chambre_history_futures(self, client, equipments, name):
        eq = next(e for e in equipments if (e.get("nom") or e.get("reference")) == name)
        r = client.get(f"{BASE_URL}/api/equipments/{eq['id']}/history")
        assert r.status_code == 200, r.text
        data = r.json()
        futures = data.get("futures", [])
        assert len(futures) > 0, f"{name} has no future maintenances"

    def test_chambre_chronique_many_futures(self, client, equipments):
        eq = next(e for e in equipments if (e.get("nom") or e.get("reference")) == "Chambre Chronique")
        r = client.get(f"{BASE_URL}/api/equipments/{eq['id']}/history")
        assert r.status_code == 200
        futures = r.json().get("futures", [])
        # expected ~39
        assert len(futures) >= 20, f"expected many futures for Chambre Chronique, got {len(futures)}"
