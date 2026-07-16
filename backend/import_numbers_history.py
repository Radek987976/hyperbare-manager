"""
Import des historiques d'interventions depuis les fichiers Apple Numbers.
- compresseur.numbers : interventions + compteur horaire pour BAUER 01 et LUCHARD
- chambre / cuves / extincteur / pupitre .numbers : interventions sur les autres équipements
Idempotent : source="hist_numbers".
"""
import asyncio
import os
import glob
import datetime
import uuid
from numbers_parser import Document
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
NUM_DIR = "/tmp/numbers"

CURATIVE_KW = ["dépann", "depann", "remplac", "répar", "repar", "panne", "fuite", "casse", "défaut", "defaut"]


def clean(txt):
    if txt is None:
        return ""
    s = str(txt).strip()
    for p in ("Z_", "Y_", "X_", "W_"):
        if s.startswith(p):
            s = s[len(p):]
    return s.strip()


def to_date(v):
    if isinstance(v, datetime.datetime):
        return v.strftime("%Y-%m-%d")
    return None


def guess_type(action):
    a = (action or "").lower()
    return "curative" if any(k in a for k in CURATIVE_KW) else "preventive"


async def build_ref_map(db):
    m = {}
    async for e in db.equipments.find({}, {"_id": 0, "id": 1, "reference": 1}):
        if e.get("reference"):
            m[e["reference"]] = e["id"]
    return m


def rows_of(path):
    doc = Document(path)
    t = doc.sheets[0].tables[0]
    return t.rows(values_only=True)


def header_index(rows):
    for i, r in enumerate(rows):
        if r and any(str(c) == "LOCALISATION" for c in r):
            return i
    return 0


def map_compresseur(loc, ref):
    loc = (loc or "").strip()
    if loc.startswith("BAUER 01"):
        return ref.get("BAUER 01")
    if loc.startswith("LUCHARD"):
        return ref.get("LUCHARD")
    return None  # BAUER 02 ignoré (non demandé)


def map_chambre(loc, ref):
    l = (loc or "").upper()
    if "CHRON" in l:
        return ref.get("Chambre Chronique")
    if "URG" in l:
        return ref.get("Chambre Urgence")
    if "SAS" in l:
        return ref.get("Chambre SAS")
    return ref.get("Caisson (général)")


def map_cuves(loc, ref):
    l = (loc or "").upper()
    if "CHRON" in l:
        return ref.get("Cuve Chronique W3006")
    if "URG" in l:
        return ref.get("Cuve Urgence W3004")
    if "SAS" in l:
        return ref.get("Cuve SAS W3015")
    return ref.get("Caisson (général)")


def map_extincteur(loc, equip, detail, ref):
    e = (equip or "").upper()
    l = (loc or "").upper()
    blob = f"{equip} {detail}".upper()
    if "ARI C1" in e:
        return ref.get("ARI C1")
    if "ARI C2" in e:
        return ref.get("ARI C2")
    if "A.R.I" in l or l == "ARI" or "ARI" in e:
        return ref.get("ARI C1") or ref.get("ARI (parc)")
    for cx, rid in (("0198-0016", "Extincteur CX0198-0016"), ("0219-0018", "Extincteur CX0219-0018"),
                    ("0219-0024", "Extincteur CX0219-0024"), ("0219-0082", "Extincteur CX0219-0082")):
        if cx.replace("-", "") in blob.replace("-", ""):
            return ref.get(rid)
    return map_chambre(loc, ref)


def map_pupitre(loc, ref):
    return ref.get("Pupitre de commande") or map_chambre(loc, ref)


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]
    ref = await build_ref_map(db)

    # nettoyage idempotent
    await db.interventions.delete_many({"source": "hist_numbers"})

    docs = []
    compteurs = {"BAUER 01": [], "LUCHARD": []}

    # ---- COMPRESSEUR (col décalée : INTERV=4, DATE=5, COMPTEUR=6, INTERVENANTS=7, OBS=8, DETAIL=2) ----
    rows = rows_of(f"{NUM_DIR}/compresseur.numbers")
    hidx = header_index(rows)
    for r in rows[hidx + 1:]:
        def g(i):
            return r[i] if i < len(r) else None
        loc = g(0)
        eqid = map_compresseur(loc, ref)
        date = to_date(g(5))
        action = clean(g(4))
        if not eqid or not date or not action:
            continue
        docs.append(mk(eqid, date, action, clean(g(7)), g(2), g(8), g(6)))
        # compteur
        key = "BAUER 01" if (loc or "").startswith("BAUER 01") else ("LUCHARD" if (loc or "").startswith("LUCHARD") else None)
        comp = g(6)
        if key and comp not in (None, "") and isinstance(g(5), datetime.datetime):
            try:
                compteurs[key].append((g(5), float(str(comp).replace(",", "."))))
            except ValueError:
                pass

    # ---- AUTRES FICHIERS (LOC=0,EQUIP=1,DETAIL=2,INTERV=3,DATE=4,COMPTEUR=5,INTERVENANTS=6,OBS=7) ----
    other = {
        "chambre.numbers": map_chambre,
        "cuves.numbers": map_cuves,
        "extincteur.numbers": map_extincteur,
        "pupitre.numbers": map_pupitre,
    }
    for fname, mapper in other.items():
        rows = rows_of(f"{NUM_DIR}/{fname}")
        hidx = header_index(rows)
        for r in rows[hidx + 1:]:
            def g(i):
                return r[i] if i < len(r) else None
            loc, equip, detail = g(0), g(1), g(2)
            date = to_date(g(4))
            action = clean(g(3))
            if not date or not action:
                continue
            if fname == "extincteur.numbers":
                eqid = mapper(loc, equip, detail, ref)
            else:
                eqid = mapper(loc, ref)
            if not eqid:
                continue
            docs.append(mk(eqid, date, action, clean(g(6)), detail, g(7), None))

    if docs:
        await db.interventions.insert_many(docs)

    # ---- Mise à jour compteurs BAUER 01 et LUCHARD ----
    result = {}
    for key in ("BAUER 01", "LUCHARD"):
        readings = compteurs[key]
        eqid = ref.get(key)
        if not eqid or not readings:
            result[key] = "aucune donnée"
            continue
        readings.sort(key=lambda x: x[0])
        latest = readings[-1][1]
        hist = []
        seen = set()
        for dt, v in readings:
            k = (dt.strftime("%Y-%m-%d"), v)
            if k in seen:
                continue
            seen.add(k)
            hist.append({"date": dt.strftime("%Y-%m-%d"), "valeur": v, "technicien": "Import historique", "source": "hist_numbers"})
        await db.equipments.update_one(
            {"id": eqid},
            {"$set": {"compteur_horaire": latest, "historique_compteur": hist}},
        )
        result[key] = f"{latest} h ({len(hist)} relevés)"

    print("Interventions importées:", len(docs))
    for k, v in result.items():
        print(f"Compteur {k}: {v}")
    print("Total interventions en base:", await db.interventions.count_documents({}))


def mk(eqid, date, action, tech, detail, obs, compteur):
    observations = " | ".join([x for x in [clean(detail) or None, clean(obs) or None] if x]) or None
    ch = None
    if compteur not in (None, ""):
        try:
            ch = float(str(compteur).replace(",", "."))
        except ValueError:
            ch = None
    return {
        "id": str(uuid.uuid4()),
        "work_order_id": None,
        "maintenance_preventive_id": None,
        "type_intervention": guess_type(action),
        "date_intervention": date,
        "technicien": tech or "Historique",
        "actions_realisees": action,
        "observations": observations,
        "pieces_utilisees": [],
        "duree_minutes": None,
        "compteur_horaire": ch,
        "equipment_id": eqid,
        "source": "hist_numbers",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    asyncio.run(main())
