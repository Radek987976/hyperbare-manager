"""Crée Extincteurs / ARI / Caisson (général) et relie les ~50 maintenances restantes (100% rattachées)."""
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


def ensure_type(nom, desc):
    if not db.equipment_types.find_one({"nom": nom}):
        db.equipment_types.insert_one({"id": str(uuid.uuid4()), "nom": nom, "description": desc,
                                       "icon": None, "created_at": now()})


def ensure_equipment(ref, sn, etype, desc, criticite="haute"):
    ex = db.equipments.find_one({"reference": ref})
    if ex:
        return ex["id"]
    eid = str(uuid.uuid4())
    db.equipments.insert_one({
        "id": eid, "type": etype, "reference": ref, "numero_serie": sn,
        "criticite": criticite, "statut": "en_service", "caisson_id": cid,
        "description": desc, "date_installation": None, "photos": [], "documents": [],
        "compteur_horaire": None, "historique_compteur": [], "created_at": now(),
    })
    return eid


ensure_type("Extincteur hyperbare", "Extincteurs hyperbares")
ensure_type("ARI", "Appareils respiratoires isolants")
ensure_type("Caisson", "Contrôles au niveau du caisson entier")

ext_id = ensure_equipment("Extincteurs hyperbares", "EXT-PARC", "Extincteur hyperbare", "Parc des extincteurs hyperbares", "critique")
ari_id = ensure_equipment("ARI (parc)", "ARI-PARC", "ARI", "Parc des appareils respiratoires isolants")
cais_id = ensure_equipment("Caisson (général)", "CAISSON-GEN", "Caisson", "Contrôles et opérations au niveau du caisson complet", "critique")

# Réseau gaz & cuve existants
rg = db.equipments.find_one({"reference": "Réseau gaz"})
rg_id = rg["id"] if rg else None
cuve = db.equipments.find_one({"reference": {"$regex": "W3006"}})
cuve_id = cuve["id"] if cuve else None

# Règles ordonnées (seulement si equipment_id None) — chaque WO rattaché une seule fois
rules = [
    (ext_id, "extincteur"),
    (ari_id, r"a\.?r\.?i"),
]
if rg_id:
    rules.append((rg_id, r"bouteille|flexible|fluide|respirable|sous pression|b50|b5 |oxyg|héliox|heliox|nitrox|azote|co²|co2|4000"))
if cuve_id:
    rules.append((cuve_id, "cuve"))

report = {}
for eid, kw in rules:
    rx = {"$regex": kw, "$options": "i"}
    wo = db.work_orders.update_many({"equipment_id": None, "titre": rx}, {"$set": {"equipment_id": eid}})
    insp = db.inspections.update_many({"equipment_id": None, "titre": rx}, {"$set": {"equipment_id": eid}})
    report[kw[:25]] = {"wo": wo.modified_count, "insp": insp.modified_count}

# Catch-all restant -> Caisson (général)
rest_wo = db.work_orders.update_many({"equipment_id": None}, {"$set": {"equipment_id": cais_id}})
rest_insp = db.inspections.update_many({"equipment_id": None}, {"$set": {"equipment_id": cais_id}})
report["catch_all_caisson"] = {"wo": rest_wo.modified_count, "insp": rest_insp.modified_count}

print("=== RELIAISON DES MAINTENANCES RESTANTES ===")
for k, v in report.items():
    print(f"  {k}: {v}")
print("Total équipements:", db.equipments.count_documents({}))
print("Work orders non reliés:", db.work_orders.count_documents({"equipment_id": None}))
print("Inspections non reliées:", db.inspections.count_documents({"equipment_id": None}))
