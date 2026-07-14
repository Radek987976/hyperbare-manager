"""Import des données réelles des fichiers Excel du client dans MongoDB (hyperbaremanager_prod).
Sources: maintenance.xlsx, suivi_controle.xlsx, budget.xlsx (téléchargés depuis les artefacts client).
"""
import os
import re
import uuid
import math
from datetime import datetime, timezone

import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

SRC = "/tmp/imports"
MAINT = f"{SRC}/maintenance.xlsx"
SUIVI = f"{SRC}/suivi_controle.xlsx"
BUDGET = f"{SRC}/budget.xlsx"

now_iso = lambda: datetime.now(timezone.utc).isoformat()


def clean(v):
    if v is None:
        return None
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, str):
        s = v.strip()
        return s if s and s.lower() != "nan" else None
    return v


def to_date_str(v):
    v = clean(v)
    if v is None:
        return None
    if isinstance(v, (datetime, pd.Timestamp)):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, (int, float)):
        # probablement une annee
        return str(int(v))
    return str(v)


def new_id():
    return str(uuid.uuid4())


PERIOD_MAP = {
    7: "hebdomadaire", 15: "hebdomadaire", 30: "mensuel", 60: "mensuel",
    90: "trimestriel", 120: "trimestriel", 180: "semestriel", 240: "semestriel",
    360: "annuel", 365: "annuel", 720: "biannuel", 730: "biannuel",
    1080: "triennal", 1095: "triennal", 1800: "quinquennal", 1825: "quinquennal",
    3600: "decennal", 3650: "decennal",
}


def map_periodicite(jour, egal=None):
    jour = clean(jour)
    try:
        j = int(float(jour))
        if j in PERIOD_MAP:
            return PERIOD_MAP[j]
        # arrondi au plus proche connu
        keys = sorted(PERIOD_MAP.keys())
        nearest = min(keys, key=lambda k: abs(k - j))
        return PERIOD_MAP[nearest]
    except (TypeError, ValueError):
        pass
    e = (clean(egal) or "").lower()
    if "jour" in e:
        return "hebdomadaire"
    if "mois" in e:
        if e.strip().startswith("1"):
            return "mensuel"
        return "semestriel"
    if "10 an" in e:
        return "decennal"
    if "5 an" in e:
        return "quinquennal"
    if "3 an" in e:
        return "triennal"
    if "2 an" in e:
        return "biannuel"
    if "an" in e:
        return "annuel"
    return "annuel"


def classify_controle(titre):
    t = (titre or "").lower()
    if "air respirable" in t or "analyse de l'air" in t or "analyse de l’air" in t:
        return "analyse_air"
    if ("talonnage" in t or "rification" in t) and "manom" in t:
        return "etalonnage_manometre"
    if "soupape" in t:
        return "etalonnage_soupape"
    if any(k in t for k in ["preuve", "épreuve", "requalification", "inspection interne", "hydraulique"]):
        return "controle_reglementaire"
    return "controle_periodique"


def header_row(f, sheet, token="Réf", maxr=10):
    df = pd.read_excel(f, sheet_name=sheet, header=None, nrows=maxr)
    for r in range(maxr):
        if str(df.iloc[r, 0]).strip() == token:
            return r
    return None


REF_RE = re.compile(r"^[A-Za-zÀ-ÿ]{2,5}\s?\d+$")


def import_all():
    report = {}

    # ---------- 0. Nettoyage des donnees de test ----------
    db.gas_cylinders.delete_many({"numero_bouteille": {"$regex": "^TEST", "$options": "i"}})
    db.budget.delete_many({"designation": {"$regex": "test", "$options": "i"}})
    db.control_reports.delete_many({"numero_pv": {"$regex": "test", "$options": "i"}})
    db.contracts.delete_many({"numero_contrat": {"$regex": "test", "$options": "i"}})
    db.documents.delete_many({"titre": {"$regex": "^test", "$options": "i"}})
    db.contractors.delete_many({"nom": {"$regex": "test", "$options": "i"}})
    db.interventions.delete_many({"technicien": {"$regex": "test", "$options": "i"}})
    db.equipment_types.delete_many({"nom": {"$regex": "Updated Test", "$options": "i"}})

    # ---------- 1. Caisson ----------
    caisson = db.caisson.find_one({})
    if not caisson:
        cid = new_id()
        db.caisson.insert_one({
            "id": cid,
            "identifiant": "CH-01",
            "modele": "Caisson Hyperbare Multiplaces",
            "fabricant": "CMC Mahieu",
            "date_mise_en_service": "2001",
            "pression_maximale": 5.0,
            "normes_applicables": ["Directive 2014/68/UE", "NF EN 14931", "Arrêté du 15 mars 2000"],
            "description": "Caisson hyperbare 50 000 litres PS 5 bars / PE 7,5 bars (année 2001)",
            "created_at": now_iso(),
        })
    else:
        cid = caisson["id"]
    report["caisson_id"] = cid

    # ---------- 2. Types d'equipement supplementaires ----------
    existing_types = {t["nom"] for t in db.equipment_types.find({}, {"nom": 1})}
    for nom, desc in [("Cuve incendie", "Cuves de sécurité incendie"),
                      ("Extincteur hyperbare", "Extincteurs hyperbares"),
                      ("ARI", "Appareils respiratoires isolants"),
                      ("Manomètre", "Manomètres et instruments de mesure")]:
        if nom not in existing_types:
            db.equipment_types.insert_one({"id": new_id(), "nom": nom, "description": desc,
                                           "icon": None, "created_at": now_iso()})

    # ---------- 3. Equipements physiques ----------
    equip_map = {}  # code -> equipment_id

    def add_equipment(code, type_, reference, numero_serie, criticite="normale", compteur=None, desc=None):
        eid = new_id()
        doc = {
            "id": eid, "type": type_, "reference": reference, "numero_serie": numero_serie,
            "criticite": criticite, "statut": "en_service", "caisson_id": cid,
            "description": desc, "date_installation": None, "photos": [], "documents": [],
            "compteur_horaire": compteur, "historique_compteur": [], "created_at": now_iso(),
        }
        db.equipments.insert_one(doc)
        equip_map[code] = eid
        return eid

    if db.equipments.count_documents({}) == 0:
        add_equipment("bauer01", "Compresseur", "BAUER 01", "150-11-5_5200-3227/9/2000",
                      criticite="critique", compteur=0.0, desc="Compresseur air respirable BAUER 01")
        add_equipment("bauer02", "Compresseur", "BAUER 02", "150-11-5_5200-3226/9/2000",
                      criticite="critique", compteur=0.0, desc="Compresseur air respirable BAUER 02")
        add_equipment("luchard", "Compresseur", "LUCHARD", "LUCHARD",
                      criticite="haute", compteur=0.0, desc="Compresseur LUCHARD")
        add_equipment("cuve_w3006", "Cuve incendie", "Cuve Chronique W3006", "W3006",
                      criticite="haute", desc="Cuve incendie Chronique 675 L PS16 bars")
        add_equipment("cuve_w3015", "Cuve incendie", "Cuve SAS W3015", "W3015",
                      criticite="haute", desc="Cuve incendie SAS 675 L PS16 bars")
        add_equipment("cuve_w3004", "Cuve incendie", "Cuve Urgence W3004", "W3004",
                      criticite="haute", desc="Cuve incendie Urgence 675 L PS16 bars")
        add_equipment("ari_c1", "ARI", "ARI C1", "SD7566",
                      desc="Appareil respiratoire isolant FENZY AERIS C1")
        add_equipment("ari_c2", "ARI", "ARI C2", "VZ3355",
                      desc="Appareil respiratoire isolant FENZY AERIS C2")
    else:
        for e in db.equipments.find({}, {"id": 1, "reference": 1}):
            ref = (e.get("reference") or "").lower()
            if "bauer 01" in ref:
                equip_map["bauer01"] = e["id"]
            elif "bauer 02" in ref:
                equip_map["bauer02"] = e["id"]
            elif "luchard" in ref:
                equip_map["luchard"] = e["id"]
            elif "w3006" in ref:
                equip_map["cuve_w3006"] = e["id"]
            elif "w3015" in ref:
                equip_map["cuve_w3015"] = e["id"]
            elif "w3004" in ref:
                equip_map["cuve_w3004"] = e["id"]

    def match_equipment(localisation):
        loc = (localisation or "").lower()
        if "bauer 01" in loc:
            return equip_map.get("bauer01")
        if "bauer 02" in loc:
            return equip_map.get("bauer02")
        if "luchard" in loc:
            return equip_map.get("luchard")
        if "w3006" in loc:
            return equip_map.get("cuve_w3006")
        if "w3015" in loc:
            return equip_map.get("cuve_w3015")
        if "3004" in loc:
            return equip_map.get("cuve_w3004")
        return None

    # ---------- 4. Inspections depuis feuilles maintenance ----------
    db.inspections.delete_many({"source": "import_maintenance"})
    insp_docs = []
    for sheet in ["CHAMBRE", "COMPRESSEURS", "CUVES INCENDIE", "EXTINCTEURS ARI", "PUPITRE", "RESEAU GAZ"]:
        hr = header_row(MAINT, sheet)
        if hr is None:
            continue
        df = pd.read_excel(MAINT, sheet_name=sheet, header=hr)
        cols = {str(c).strip(): i for i, c in enumerate(df.columns)}
        for _, row in df.iterrows():
            ref = clean(row.iloc[0])
            titre = clean(row.get("INTERVENTIONS"))
            if not ref or not titre or not REF_RE.match(str(ref)):
                continue
            localisation = clean(row.get("LOCALISATION"))
            equipement = clean(row.get("EQUIPEMENT"))
            obs = clean(row.get("OBSERVATION"))
            interv = clean(row.get("INTERVENANTS"))
            jour = row.get("JOUR")
            egal = clean(row.get("EGAL"))
            date_real = to_date_str(row.get("DATE"))
            date_val = to_date_str(row.get("DATE2"))
            note_parts = []
            if localisation:
                note_parts.append(f"Localisation: {localisation}")
            if equipement:
                note_parts.append(f"Équipement: {equipement}")
            if obs:
                note_parts.append(f"Obs: {obs}")
            insp_docs.append({
                "id": new_id(),
                "titre": titre if not localisation else f"{titre} ({localisation})",
                "type_controle": classify_controle(titre),
                "periodicite": map_periodicite(jour, egal),
                "caisson_id": cid,
                "equipment_id": match_equipment(localisation),
                "date_realisation": date_real,
                "date_validite": date_val,
                "organisme_certificateur": interv,
                "resultat": obs,
                "observations": " | ".join(note_parts) or None,
                "procedure_documents": [],
                "source": "import_maintenance",
                "created_at": now_iso(),
            })
    if insp_docs:
        db.inspections.insert_many(insp_docs)
    report["inspections_maintenance"] = len(insp_docs)

    # ---------- 5. Inspections depuis suivi_controle (controles reglementaires) ----------
    db.inspections.delete_many({"source": "import_suivi"})
    suivi_docs = []

    # Manometre
    dfm = pd.read_excel(SUIVI, sheet_name="Manomètre", header=0)
    for _, r in dfm.iterrows():
        conc = clean(r.get("CONCATENER"))
        if not conc:
            continue
        ident = clean(r.get("Identification")) or clean(r.get("N° série")) or conc
        pv = clean(r.get("N° PV"))
        suivi_docs.append({
            "id": new_id(),
            "titre": f"Contrôle manomètre {ident}",
            "type_controle": "etalonnage_manometre",
            "periodicite": map_periodicite(None, clean(r.get("Périodicité"))),
            "caisson_id": cid, "equipment_id": None,
            "date_realisation": to_date_str(r.get("Date intervention")),
            "date_validite": to_date_str(r.get("DATE PROCHAIN")),
            "organisme_certificateur": clean(r.get("Controleur")),
            "resultat": clean(r.get("ETAT / OBSERVATIONS")),
            "observations": f"N° PV: {pv}" if pv else None,
            "procedure_documents": [], "source": "import_suivi", "created_at": now_iso(),
        })

    # Contenant sous pression
    dfc = pd.read_excel(SUIVI, sheet_name="Contenant sous pression", header=0)
    for _, r in dfc.iterrows():
        typ = clean(r.get("Type"))
        interv = clean(r.get("Intervention"))
        if not typ and not interv:
            continue
        ident = clean(r.get("Identification")) or clean(r.get("N° série")) or ""
        pv = clean(r.get("N° PV"))
        suivi_docs.append({
            "id": new_id(),
            "titre": f"{interv or 'Contrôle'} - {typ or ''} {ident}".strip(),
            "type_controle": "controle_reglementaire",
            "periodicite": map_periodicite(None, clean(r.get("Périodicité"))),
            "caisson_id": cid, "equipment_id": match_equipment(ident),
            "date_realisation": to_date_str(r.get("Date de l'épreuve")),
            "date_validite": to_date_str(r.get("Prochaine intervention")),
            "organisme_certificateur": clean(r.get("Controleur")),
            "resultat": clean(r.get("Observation")),
            "observations": f"N° PV: {pv}" if pv else None,
            "procedure_documents": [], "source": "import_suivi", "created_at": now_iso(),
        })

    # Securite incendie
    dfs = pd.read_excel(SUIVI, sheet_name="Sécurité incendie", header=0)
    for _, r in dfs.iterrows():
        typ = clean(r.get("Type"))
        interv = clean(r.get("Intervention"))
        if not typ and not interv:
            continue
        ident = clean(r.get("Identification")) or clean(r.get("N° série")) or ""
        pv = clean(r.get("N° PV"))
        suivi_docs.append({
            "id": new_id(),
            "titre": f"{interv or 'Contrôle'} - {typ or ''}".strip(),
            "type_controle": "controle_reglementaire",
            "periodicite": map_periodicite(None, clean(r.get("Périodicité"))),
            "caisson_id": cid, "equipment_id": match_equipment(ident),
            "date_realisation": to_date_str(r.get("date de control")),
            "date_validite": to_date_str(r.get("Prochain contrôle")),
            "organisme_certificateur": clean(r.get("Controleur")),
            "resultat": clean(r.get("Observation")),
            "observations": f"N° PV: {pv}" if pv else None,
            "procedure_documents": [], "source": "import_suivi", "created_at": now_iso(),
        })

    # Soupapes (header a la ligne 2)
    dfsp = pd.read_excel(SUIVI, sheet_name="Soupapes", header=2)
    for _, r in dfsp.iterrows():
        soup = clean(r.iloc[0])
        if not soup or str(soup).lower().startswith("soupape"):
            continue
        suivi_docs.append({
            "id": new_id(),
            "titre": f"Vérification soupape {soup}",
            "type_controle": "etalonnage_soupape",
            "periodicite": "annuel",
            "caisson_id": cid, "equipment_id": None,
            "date_realisation": to_date_str(r.iloc[6]),
            "date_validite": None,
            "organisme_certificateur": clean(r.iloc[1]),
            "resultat": clean(r.iloc[8]),
            "observations": f"Modèle: {clean(r.iloc[2])} - N° série: {clean(r.iloc[3])} - Tarage: {clean(r.iloc[4])} bar",
            "procedure_documents": [], "source": "import_suivi", "created_at": now_iso(),
        })

    if suivi_docs:
        db.inspections.insert_many(suivi_docs)
    report["inspections_suivi"] = len(suivi_docs)

    # ---------- 6. Budget 2026 ----------
    db.budget.delete_many({"source": "import_budget"})
    TAUX_XPF_EUR = 0.00838
    DOMAINE_MAP = {
        "CYCLE": "maintenance_preventive", "COMP": "maintenance_preventive",
        "ARI": "controle_reglementaire", "CHA": "controle_reglementaire",
        "TABLEAU": "controle_reglementaire", "PUP": "controle_reglementaire",
        "CUV": "controle_reglementaire", "EXT": "controle_reglementaire",
    }
    dfb = pd.read_excel(BUDGET, sheet_name="2026", header=1)
    dfb.columns = [str(c).strip() for c in dfb.columns]
    budget_docs = []
    for _, r in dfb.iterrows():
        design = clean(r.get("Maintenance"))
        if not design:
            continue
        domaine = (clean(r.get("Domaine")) or "").upper()
        categorie = DOMAINE_MAP.get(domaine, "maintenance_preventive")
        design_type = (clean(r.get("Désignation")) or "").lower()
        if "achat" in design_type:
            categorie = "pieces_detachees"
        elif "prestation" in design_type:
            categorie = "prestation_externe"
        montant = clean(r.get("Montant"))
        try:
            montant_xpf = float(montant) if montant is not None else 0.0
        except (TypeError, ValueError):
            montant_xpf = 0.0
        fournisseur = clean(r.get("Fournisseur"))
        note = clean(r.get("Désignation"))
        budget_docs.append({
            "id": new_id(), "annee": 2026, "categorie": categorie,
            "designation": design, "description": note,
            "equipment_id": None, "contractor_id": None,
            "periodicite": clean(r.get("période")),
            "montant_prevu_xpf": montant_xpf,
            "montant_prevu_eur": round(montant_xpf * TAUX_XPF_EUR, 2),
            "montant_realise_xpf": None, "montant_realise_eur": None,
            "date_prevue": to_date_str(r.get("Pévisionnel")),
            "date_realisee": None, "statut": "prevu",
            "notes": f"Fournisseur: {fournisseur}" if fournisseur else None,
            "source": "import_budget", "created_at": now_iso(),
        })
    if budget_docs:
        db.budget.insert_many(budget_docs)
    report["budget_items"] = len(budget_docs)

    # ---------- 7. Bouteilles de gaz ----------
    db.gas_cylinders.delete_many({"source": "import_gaz"})
    dfg = pd.read_excel(SUIVI, sheet_name="Suivi Bouteilles (2)", header=3)
    gas_docs = []

    def map_gaz(nature):
        n = (nature or "").lower()
        if "oxy" in n:
            return "O2"
        if "air" in n:
            return "air_medicale"
        if "héli" in n or "heli" in n:
            return "heliox"
        if "nitrox" in n:
            return "nitrox"
        return "nitrox"  # azote/co2/autres gaz d'etalonnage

    for _, r in dfg.iterrows():
        num = clean(r.get("N° DE LA BOUT."))
        nature = clean(r.get("NATURE DU GAZ"))
        if not num or not nature:
            continue
        gaz = map_gaz(nature)
        obs = clean(r.get("ETAT / OBSERVATIONS"))
        note = f"Nature réelle: {nature}"
        if obs:
            note += f" | {obs}"
        gas_docs.append({
            "id": new_id(), "numero_bouteille": str(num), "type_gaz": gaz,
            "volume": (clean(r.get("VOL. DE BOUT.")) or "B50").replace(" ", ""),
            "pression_service": None, "fournisseur_id": None, "localisation": None,
            "date_remplissage": to_date_str(r.get("DATE REMPLISS.")),
            "date_expiration_gaz": to_date_str(r.get("DATE EXPIRAT.")),
            "date_epreuve": to_date_str(r.get("EPREUVE BOUT.")),
            "date_prochaine_epreuve": None,
            "statut": "pleine", "observations": note,
            "agent_responsable": clean(r.get("NOM DE L'AGENT")),
            "documents": [], "historique_remplissage": [],
            "source": "import_gaz", "created_at": now_iso(),
        })
    if gas_docs:
        db.gas_cylinders.insert_many(gas_docs)
    report["gas_cylinders"] = len(gas_docs)

    # ---------- 8. Pieces detachees (INVENTAIRE) ----------
    db.spare_parts.delete_many({"source": "import_inventaire"})
    dfi = pd.read_excel(MAINT, sheet_name="INVENTAIRE", header=1)
    sp_docs = []

    def to_int(v):
        v = clean(v)
        if v is None:
            return 0
        try:
            return int(float(v))
        except (TypeError, ValueError):
            m = re.search(r"\d+", str(v))
            return int(m.group()) if m else 0

    def to_float(v):
        v = clean(v)
        if v is None:
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    for _, r in dfi.iterrows():
        nom = clean(r.get("DENOMIATION"))
        if not nom:
            continue
        ref = clean(r.get("REFERENCE")) or clean(r.get("KIT")) or clean(r.get("DETAIL / DIMENSION")) or nom
        sp_docs.append({
            "id": new_id(), "nom": nom, "reference_fabricant": str(ref),
            "equipment_type": (clean(r.get("ONGLET")) or "Autre").capitalize(),
            "quantite_stock": to_int(r.get("EN STOCK")),
            "seuil_minimum": 1,
            "emplacement": clean(r.get("LOCALISATION")),
            "fournisseur": clean(r.get("FABRIQUANT")) or clean(r.get("FOURNISSEUR")),
            "prix_unitaire": to_float(r.get("PRIX ACHAT UNITAIRE")),
            "photos": [], "documents": [],
            "source": "import_inventaire", "created_at": now_iso(),
        })
    if sp_docs:
        db.spare_parts.insert_many(sp_docs)
    report["spare_parts"] = len(sp_docs)

    return report


if __name__ == "__main__":
    rep = import_all()
    print("=== IMPORT TERMINÉ ===")
    for k, v in rep.items():
        print(f"  {k}: {v}")
    print("\n=== COMPTES FINAUX ===")
    for c in ["caisson", "equipments", "inspections", "budget", "gas_cylinders",
              "spare_parts", "contractors", "control_reports"]:
        print(f"  {c}: {db[c].count_documents({})}")
