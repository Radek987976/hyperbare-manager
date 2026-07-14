"""Crée les équipements Chambre Chronique / SAS / Urgence et relie leurs maintenances (work_orders + inspections)."""
import os
import re
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
now = lambda: datetime.now(timezone.utc).isoformat()

caisson = db.caisson.find_one({})
cid = caisson["id"] if caisson else None

# Type d'équipement
if not db.equipment_types.find_one({"nom": "Chambre hyperbare"}):
    db.equipment_types.insert_one({"id": str(uuid.uuid4()), "nom": "Chambre hyperbare",
                                   "description": "Chambres/compartiments hyperbares", "icon": None, "created_at": now()})

CHAMBERS = [
    ("chronique", "Chambre Chronique", "CH-CHRONIQUE", ["chronique"]),
    ("sas", "Chambre SAS", "CH-SAS", ["sas"]),
    ("urgence", "Chambre Urgence", "CH-URGENCE", ["urgence"]),
]

ids = {}
for key, ref, sn, _ in CHAMBERS:
    existing = db.equipments.find_one({"reference": ref})
    if existing:
        ids[key] = existing["id"]
        continue
    eid = str(uuid.uuid4())
    db.equipments.insert_one({
        "id": eid, "type": "Chambre hyperbare", "reference": ref, "numero_serie": sn,
        "criticite": "critique", "statut": "en_service", "caisson_id": cid,
        "description": f"{ref} du caisson hyperbare multiplaces",
        "date_installation": None, "photos": [], "documents": [],
        "compteur_horaire": None, "historique_compteur": [], "created_at": now(),
    })
    ids[key] = eid

report = {}
for key, ref, sn, keywords in CHAMBERS:
    eid = ids[key]
    # regex insensible à la casse sur le mot-clé
    rx = {"$regex": keywords[0], "$options": "i"}
    wo = db.work_orders.update_many(
        {"equipment_id": None, "titre": rx}, {"$set": {"equipment_id": eid}})
    insp = db.inspections.update_many(
        {"equipment_id": None, "titre": rx}, {"$set": {"equipment_id": eid}})
    report[ref] = {"equipment_id": eid, "work_orders_liés": wo.modified_count, "inspections_liées": insp.modified_count}

print("=== CHAMBRES CRÉÉES & MAINTENANCES RELIÉES ===")
for k, v in report.items():
    print(f"  {k}: {v}")
print("Total équipements:", db.equipments.count_documents({}))
