"""Crée les équipements Pupitre et Réseau gaz et relie leurs maintenances non rattachées."""
import os
import uuid
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
now = lambda: datetime.now(timezone.utc).isoformat()

caisson = db.caisson.find_one({})
cid = caisson["id"] if caisson else None

for nom, desc in [("Pupitre", "Pupitre de commande et tableaux de contrôle"),
                  ("Réseau gaz", "Réseau de distribution des gaz (vannes, détendeurs)")]:
    if not db.equipment_types.find_one({"nom": nom}):
        db.equipment_types.insert_one({"id": str(uuid.uuid4()), "nom": nom, "description": desc,
                                       "icon": None, "created_at": now()})

# (clé, référence, n° série, type, mots-clés regex) — traité dans l'ordre
ASSETS = [
    ("reseau_gaz", "Réseau gaz", "RG-01", "Réseau gaz", ["réseau", "reseau", "détendeur", "detendeur", "vanne", "gaz"]),
    ("pupitre", "Pupitre de commande", "PUP-01", "Pupitre", ["pupitre", "tableau"]),
]

report = {}
for key, ref, sn, etype, keywords in ASSETS:
    existing = db.equipments.find_one({"reference": ref})
    if existing:
        eid = existing["id"]
    else:
        eid = str(uuid.uuid4())
        db.equipments.insert_one({
            "id": eid, "type": etype, "reference": ref, "numero_serie": sn,
            "criticite": "haute", "statut": "en_service", "caisson_id": cid,
            "description": f"{ref} du caisson hyperbare",
            "date_installation": None, "photos": [], "documents": [],
            "compteur_horaire": None, "historique_compteur": [], "created_at": now(),
        })
    rx = {"$regex": "|".join(keywords), "$options": "i"}
    wo = db.work_orders.update_many({"equipment_id": None, "titre": rx}, {"$set": {"equipment_id": eid}})
    insp = db.inspections.update_many({"equipment_id": None, "titre": rx}, {"$set": {"equipment_id": eid}})
    report[ref] = {"id": eid, "work_orders_liés": wo.modified_count, "inspections_liées": insp.modified_count}

print("=== PUPITRE & RÉSEAU GAZ ===")
for k, v in report.items():
    print(f"  {k}: {v}")
print("Total équipements:", db.equipments.count_documents({}))
print("Work orders non reliés restants:", db.work_orders.count_documents({"equipment_id": None}))
