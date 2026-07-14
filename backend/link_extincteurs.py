"""Sépare le parc extincteurs en 4 extincteurs individuels et relie leurs contrôles/maintenances."""
import os
import re
import uuid
from datetime import datetime, timezone
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
now = lambda: datetime.now(timezone.utc).isoformat()
SUIVI = "/tmp/imports/suivi_controle.xlsx"

caisson = db.caisson.find_one({})
cid = caisson["id"] if caisson else None


def to_date(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, (datetime, pd.Timestamp)):
        return v.strftime("%Y-%m-%d")
    return str(v)


def clean(v):
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    s = str(v).strip()
    return s if s and s.lower() != "nan" else None


def map_periodicite(txt):
    t = (txt or "").lower()
    if "5 an" in t:
        return "quinquennal"
    if "10 an" in t:
        return "decennal"
    if "2 an" in t:
        return "biannuel"
    if "6 mois" in t or "semest" in t:
        return "semestriel"
    if "3 mois" in t or "trimest" in t:
        return "trimestriel"
    if "an" in t:
        return "annuel"
    return "annuel"


# 4 extincteurs : code Identification -> (référence, description)
EXT = {
    "CX01980016": ("Extincteur CX0198-0016", "SE 481 BA (3L) - série 184273W1S1 - 2017"),
    "CX02190018": ("Extincteur CX0219-0018", "SE 480 BA (6,1L) - série 173887W1S7 - 2017"),
    "CX02190024": ("Extincteur CX0219-0024", "SE 480 BA (6,1L) - série 184621W1S4 - 2018"),
    "CX02190082": ("Extincteur CX0219-0082", "SE480 BA (6,1L) - série 213832W1S3 - 2021"),
}

if not db.equipment_types.find_one({"nom": "Extincteur hyperbare"}):
    db.equipment_types.insert_one({"id": str(uuid.uuid4()), "nom": "Extincteur hyperbare",
                                   "description": "Extincteurs hyperbares", "icon": None, "created_at": now()})

ext_ids = {}
for code, (ref, desc) in EXT.items():
    ex = db.equipments.find_one({"reference": ref})
    if ex:
        ext_ids[code] = ex["id"]
        continue
    eid = str(uuid.uuid4())
    db.equipments.insert_one({
        "id": eid, "type": "Extincteur hyperbare", "reference": ref, "numero_serie": code,
        "criticite": "critique", "statut": "en_service", "caisson_id": cid,
        "description": desc, "date_installation": None, "date_reforme": None, "motif_reforme": None,
        "photos": [], "documents": [], "compteur_horaire": None, "historique_compteur": [], "created_at": now(),
    })
    ext_ids[code] = eid

parc = db.equipments.find_one({"reference": "Extincteurs hyperbares"})
parc_id = parc["id"] if parc else None

# 1) Supprimer les anciens contrôles génériques du parc et ré-importer par extincteur
if parc_id:
    db.inspections.delete_many({"equipment_id": parc_id})

df = pd.read_excel(SUIVI, sheet_name="Sécurité incendie", header=0)
insp_docs = []
for _, r in df.iterrows():
    ident = clean(r.get("Identification"))
    if not ident or ident not in ext_ids:
        continue
    interv = clean(r.get("Intervention")) or "Contrôle"
    ref = EXT[ident][0]
    tc = "controle_reglementaire" if "preuve" in interv.lower() else "controle_periodique"
    insp_docs.append({
        "id": str(uuid.uuid4()),
        "titre": f"{interv} - {ref}",
        "type_controle": tc,
        "periodicite": map_periodicite(clean(r.get("Périodicité"))),
        "caisson_id": cid, "equipment_id": ext_ids[ident],
        "date_realisation": to_date(r.get("date de control")),
        "date_validite": to_date(r.get("Prochain contrôle")),
        "organisme_certificateur": clean(r.get("Controleur")),
        "resultat": clean(r.get("Observation")),
        "observations": f"N° PV: {clean(r.get('N° PV'))}" if clean(r.get("N° PV")) else None,
        "procedure_documents": [], "source": "import_extincteur", "created_at": now(),
    })
if insp_docs:
    db.inspections.insert_many(insp_docs)

# 2) Réassigner les work_orders du parc aux 4 extincteurs (round-robin pour les entretiens)
codes = list(ext_ids.keys())
wo_report = 0
if parc_id:
    parc_wos = list(db.work_orders.find({"equipment_id": parc_id}, {"_id": 0, "id": 1, "titre": 1}))
    idx = 0
    for wo in parc_wos:
        t = (wo.get("titre") or "").lower()
        if "réépreuve" in t or "reepreuve" in t or "cuve" in t:
            target = ext_ids[codes[0]]  # réépreuve cuve -> 1er extincteur
        else:
            target = ext_ids[codes[idx % 4]]
            idx += 1
        db.work_orders.update_one({"id": wo["id"]}, {"$set": {"equipment_id": target}})
        wo_report += 1

# 3) Supprimer l'équipement parc
if parc_id:
    db.equipments.delete_one({"id": parc_id})

print("=== EXTINCTEURS SÉPARÉS ===")
for code, (ref, _) in EXT.items():
    eid = ext_ids[code]
    print(f"  {ref}: inspections={db.inspections.count_documents({'equipment_id': eid})}, "
          f"work_orders={db.work_orders.count_documents({'equipment_id': eid})}")
print(f"Work orders réassignés depuis le parc: {wo_report}")
print(f"Inspections extincteurs recréées: {len(insp_docs)}")
print(f"Total équipements: {db.equipments.count_documents({})}")
