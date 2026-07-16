"""
Import de l'historique des manomètres (Classeur1.xlsx) en interventions.
Rattachement :
  - contrôle/étalonnage 'chambres hyperbare' (piézo) -> manomètre GE PTx7517-1 de la chambre
  - références spécifiques (932-935 CJ, CHPF 01/02, 612T9/610T9) -> le manomètre concerné
  - fluides médicaux / 0-60m au pupitre (générique) -> équipement Pupitre de commande
  - tests de circuits / étanchéité -> équipement Chambre concernée
Idempotent : source="mano_history".
"""
import asyncio
import os
import uuid
import datetime
import openpyxl
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
XLSX = "/tmp/classeur1.xlsx"
CURATIVE_KW = ["remplac", "dépann", "depann", "répar", "repar", "fuite"]


async def build_maps(db):
    subs = {}
    async for s in db.subequipments.find({"nom": {"$regex": "^Manom"}}, {"_id": 0, "id": 1, "nom": 1, "reference": 1}):
        subs[s["nom"]] = s["id"]
    eqs = {}
    async for e in db.equipments.find({}, {"_id": 0, "id": 1, "reference": 1}):
        if e.get("reference"):
            eqs[e["reference"]] = e["id"]

    def sub_by_nom_contains(txt):
        for nom, sid in subs.items():
            if txt in nom:
                return sid
        return None

    return subs, eqs, sub_by_nom_contains


def guess_type(txt):
    t = txt.lower()
    return "curative" if any(k in t for k in CURATIVE_KW) else "preventive"


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]
    subs, eqs, sub_contains = await build_maps(db)

    await db.interventions.delete_many({"source": "mano_history"})

    ge = {
        "chronique": sub_contains("CHA CHRO"),
        "sas": sub_contains("CHA SAS"),
        "urgence": sub_contains("CHA URG"),
    }
    pupitre = eqs.get("Pupitre de commande")
    chambre = {
        "chronique": eqs.get("Chambre Chronique"),
        "sas": eqs.get("Chambre SAS"),
        "urgence": eqs.get("Chambre Urgence"),
    }

    def loc_key(loc):
        l = (loc or "").lower()
        if "chron" in l:
            return "chronique"
        if "urg" in l:
            return "urgence"
        if "sas" in l:
            return "sas"
        return None

    def target(loc, interv, obs, detail):
        blob = f"{interv} {obs} {detail}".lower()
        lk = loc_key(loc)
        # références spécifiques
        for tag, nom in (("934 cj", "932CJ"), ("934cj", "932CJ")):
            pass
        for cj in ("932", "933", "934", "935"):
            if f"{cj} cj" in blob or f"{cj}cj" in blob:
                return sub_contains(f"{cj}CJ")
        if "chpf 02" in blob or "731c1" in blob:
            return sub_contains("731C1")
        if "chpf 01" in blob or "524g2" in blob:
            return sub_contains("524G2")
        if "612t9" in blob or "610t9" in blob:
            return sub_contains("612T9") or sub_contains("610T9")
        # manomètres piézoélectriques des chambres -> GE de la chambre
        if "piézo" in blob or "piezo" in blob or "chambres hyperbare" in blob:
            return ge.get(lk)
        # tests de circuits / étanchéité -> chambre
        if "circuit" in blob or "étanch" in blob or "etanch" in blob:
            return chambre.get(lk)
        # pupitre : fluides médicaux / 0-60m (générique)
        if "fluide" in blob or "0-60m" in blob or "0-60 m" in blob or "pupitre" in blob:
            return pupitre
        return ge.get(lk) or chambre.get(lk)

    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Feuil1"]
    rows = list(ws.iter_rows(values_only=True))[5:]
    docs = []
    unmapped = 0
    for r in rows:
        if not any(r):
            continue
        loc, equip, detail, interv, date, tech, obs = (list(r) + [None] * 7)[:7]
        if not isinstance(date, datetime.datetime) or not interv:
            continue
        eqid = target(loc, interv or "", obs or "", detail or "")
        if not eqid:
            unmapped += 1
            continue
        observations = " | ".join([x for x in [str(detail).strip() if detail else None,
                                                str(obs).strip() if obs else None] if x]) or None
        docs.append({
            "id": str(uuid.uuid4()),
            "work_order_id": None,
            "maintenance_preventive_id": None,
            "type_intervention": guess_type(str(interv) + " " + str(obs or "")),
            "date_intervention": date.strftime("%Y-%m-%d"),
            "technicien": (str(tech).strip() if tech else "Historique"),
            "actions_realisees": str(interv).strip(),
            "observations": observations,
            "pieces_utilisees": [],
            "duree_minutes": None,
            "compteur_horaire": None,
            "equipment_id": eqid,
            "source": "mano_history",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })

    if docs:
        await db.interventions.insert_many(docs)
    print(f"Interventions manomètres importées: {len(docs)} (non rattachées: {unmapped})")
    # distribution
    names = {}
    for s_nom, sid in subs.items():
        names[sid] = s_nom
    for eref, eid in eqs.items():
        names[eid] = eref
    from collections import Counter
    cnt = Counter(d["equipment_id"] for d in docs)
    for eid, n in cnt.most_common():
        print(f"  {names.get(eid, eid)}: {n}")


if __name__ == "__main__":
    asyncio.run(main())
