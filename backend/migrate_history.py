"""
Migration historique (demande utilisateur):
  A) Transforme les maintenances préventives passées en interventions "terminées".
  B) Crée les manomètres et soupapes en sous-équipements (rattachés par emplacement).
  C) Met à jour le compteur horaire du compresseur BAUER 01 (valeur historique Excel).
Idempotent: les éléments créés sont taggés source="migration_history".
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid

load_dotenv()

TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_parent_map(db):
    """Retourne {mot_clef: equipment_id} pour rattachement + fallback caisson."""
    eq = {}
    async for e in db.equipments.find({}, {"_id": 0, "id": 1, "nom": 1, "type": 1, "reference": 1}):
        key = e.get("reference") or e.get("nom")
        if key:
            eq[key] = e["id"]
    def find(name):
        return eq.get(name)
    return {
        "chronique": find("Chambre Chronique"),
        "sas": find("Chambre SAS"),
        "urgence": find("Chambre Urgence"),
        "caisson": find("Caisson (général)"),
        "bauer01": next((v for k, v in eq.items() if k == "BAUER 01"), None) or find("BAUER 01"),
    }, eq


def parent_for_location(loc, pmap):
    l = (loc or "").upper()
    if "CHRO" in l or "CHR/" in l or "/CHR" in l:
        return pmap["chronique"]
    if "URG" in l:
        return pmap["urgence"]
    if "SAS" in l:
        return pmap["sas"]
    return pmap["caisson"]


# ---- Données Manomètres (référence, emplacement) ----
MANOMETRES = [
    ("GE PTx7517-1 (CHA CHRO)", "GE PTx7517-1", "CHA CHRO"),
    ("GE PTx7517-1 (CHA SAS)", "GE PTx7517-1", "CHA SAS"),
    ("GE PTx7517-1 (CHA URG)", "GE PTx7517-1", "CHA URG"),
    ("09/0660-1 519G2", "09/0660-1 519G2", ""),
    ("09/0660-2 520G2", "09/0660-2 520G2", ""),
    ("09/0660-4 522G2", "09/0660-4 522G2", ""),
    ("09/0660-5 523G2", "09/0660-5 523G2", ""),
    ("524G2 / CHPF01", "524G2/CHPF01", "PUP URG/SAS"),
    ("609T9", "609T9", "PUP URG/SAS"),
    ("610T9", "610T9", "Réserve"),
    ("611T9", "611T9", "PUP CHRO"),
    ("612T9", "612T9", "PUP CHR/SAS"),
    ("654-A1 / CHPF03", "654-A1/CHPF03", "CHPF 03"),
    ("731C1 / CHPF02", "731C1/CHPF02", "PUP URG"),
    ("932CJ CX7979", "932CJ CX7979", "PUP OXY"),
    ("933CJ CX7979", "933CJ CX7979", "PUP AIR"),
    ("934CJ CX7979", "934CJ CX7979", "PUP HELIOX"),
    ("935CJ CX7979", "935CJ CX7979", "PUP NITROX"),
    ("936CJ CX7979", "936CJ CX7979", ""),
    ("937CJ CX7979", "937CJ CX7979", "TAB NITROX"),
    ("938CJ CX7979", "938CJ CX7979", "TAB AIR MED"),
    ("939CJ CX7979", "939CJ CX7979", "TAB HELIOX"),
    ("940CJ CX7980", "940CJ CX7980", "Réserve"),
    ("941CJ CX7980", "941CJ CX7980", "TAB NITROX"),
    ("942CJ CX7980", "942CJ CX7980", "TAB AIR MED"),
    ("943CJ CX7980", "943CJ CX7980", "TAB HELIOX"),
    ("944CJ CX7981", "944CJ CX7981", "Réserve"),
    ("CHPF 18", "CHPF 18", ""),
    ("CHPF 19", "CHPF 19", ""),
    ("CHPF 20", "CHPF 20", ""),
    ("CHPF 21", "CHPF 21", "Réserve"),
    ("CHPF 22", "CHPF 22", "réformé"),
    ("CHPF 23", "CHPF 23", ""),
    ("CHPF 24", "CHPF 24", "réformé"),
    ("CHPF 29 (Nuova Fima)", "CHPF 29", "TAB AIR RESPI"),
    ("CHPF 37", "CHPF 37", "Réserve"),
    ("CHPF 38", "CHPF 38", "Réserve"),
    ("CHPF 39", "CHPF 39", "Réserve"),
    ("CHPF 40", "CHPF 40", "Réserve"),
    ("CHPF 41", "CHPF 41", "Réserve"),
    ("CHPF 42", "CHPF 42", "Réserve"),
    ("CHPF 43", "CHPF 43", "Réserve"),
    ("CHPF 44", "CHPF 44", "réformé"),
    ("CHPF 45", "CHPF 45", "Réserve"),
    ("CHPF 46", "CHPF 46", "Réserve"),
    ("CHPF 47", "CHPF 47", "Réserve"),
    ("CHPF 51", "CHPF 51", ""),
    ("CHPF 52 (Nuova Fima)", "CHPF 52", ""),
    ("CHPF 53 (Nuova Fima)", "CHPF 53", ""),
    ("CHPF 54", "CHPF 54", "réformé"),
    ("CHPF 55", "CHPF 55", ""),
    ("CHPF 56", "CHPF 56", ""),
]

# ---- Données Soupapes (nom, référence/série, emplacement) ----
SOUPAPES = [
    ("Soupape H+Valve CHPF 04", "510BR25", "CHPF 04"),
    ("Soupape H+Valve CHPF 05", "510BR25", "CHPF 05"),
    ("Soupape H+Valve CHPF 06", "510BR25", "CHPF 06"),
    ("Soupape Nuova CW614N CHPF 07", "CW614N", "CHPF 07"),
    ("Soupape Nuova CW614N CHPF 08", "CW614N", "CHPF 08"),
    ("Soupape Nuova CW614N CHPF 09", "CW614N", "CHPF 09"),
    ("Soupape Nuova CW614N CHPF 10", "CW614N", "CHPF 10"),
    ("Soupape Nuova CW614N CHPF 11", "CW614N", "CHPF 11"),
    ("Soupape Nuova CW614N CHPF 12", "CW614N", "CHPF 12"),
    ("Soupape H+Valve CHPF 16", "510BR25", "CHPF 16"),
    ("Soupape H+Valve CHPF 17", "510BR25", "CHPF 17"),
    ("Soupape H+Valve CHPF 25", "510BR25", "CHPF 25"),
    ("Soupape H+Valve 5013897H25 (cuve SAS)", "5013897H25", "installé cuve SAS"),
    ("Soupape H+Valve 5013898H25 (cuve Urgence)", "5013898H25", "installé cuve Urgence"),
    ("Soupape H+Valve 5013899H25", "5013899H25", ""),
    ("Soupape H+Valve 5013900H25 (cuve Chronique)", "5013900H25", "installé cuve Chronique"),
    ("Soupape H+Valve 5013901H25", "5013901H25", ""),
    ("Soupape H+Valve 5013902H25", "5013902H25", ""),
    ("Soupape Nuova C614N CHPF 35", "C614N", "CHPF 35"),
    ("Soupape Nuova C614N CHPF 36", "C614N", "CHPF 36"),
    ("Soupape Nuova C614N CHPF 37", "C614N", "CHPF 37"),
    ("Soupape Nuova CW614N CHPF 48", "CW614N", "CHPF 48"),
    ("Soupape Nuova CW614N CHPF 49", "CW614N", "CHPF 49"),
    ("Soupape Nuova CW614N CHPF 50", "CW614N", "CHPF 50"),
]


async def part_a_interventions(db):
    """Maintenances préventives passées -> interventions terminées."""
    # Nettoyage idempotent des interventions déjà migrées
    await db.interventions.delete_many({"source": "migration_history"})

    past = await db.work_orders.find({
        "statut": "planifiee",
        "type_maintenance": "preventive",
    }).to_list(2000)

    created = 0
    for wo in past:
        d = wo.get("date_planifiee")
        if not d or str(d)[:10] >= TODAY:
            continue
        tech = wo.get("technicien_assigne") or "Historique (import)"
        interv = {
            "id": str(uuid.uuid4()),
            "work_order_id": None,
            "maintenance_preventive_id": wo["id"],
            "type_intervention": "preventive",
            "date_intervention": str(d)[:10],
            "technicien": tech,
            "actions_realisees": wo.get("titre") or "Maintenance préventive réalisée",
            "observations": wo.get("description") or None,
            "pieces_utilisees": [],
            "duree_minutes": None,
            "compteur_horaire": None,
            "equipment_id": wo.get("equipment_id"),
            "source": "migration_history",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.interventions.insert_one(interv)
        await db.work_orders.update_one({"id": wo["id"]}, {"$set": {"statut": "terminee"}})
        created += 1
    return created


async def part_b_sub_equipments(db, pmap):
    await db.subequipments.delete_many({"source": "migration_history"})
    count = 0
    for nom, ref, loc in MANOMETRES:
        parent = parent_for_location(loc, pmap)
        statut = "hors_service" if "réform" in (loc or "").lower() else "en_service"
        doc = {
            "id": str(uuid.uuid4()),
            "nom": f"Manomètre {nom}",
            "reference": ref,
            "numero_serie": ref,
            "parent_equipment_id": parent,
            "description": f"Manomètre - emplacement: {loc}" if loc else "Manomètre",
            "date_installation": None,
            "statut": statut,
            "photos": [],
            "documents": [],
            "source": "migration_history",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.subequipments.insert_one(doc)
        count += 1
    for nom, ref, loc in SOUPAPES:
        parent = parent_for_location(loc, pmap)
        doc = {
            "id": str(uuid.uuid4()),
            "nom": nom,
            "reference": ref,
            "numero_serie": ref,
            "parent_equipment_id": parent,
            "description": f"Soupape de sécurité - emplacement: {loc}" if loc else "Soupape de sécurité",
            "date_installation": None,
            "statut": "en_service",
            "photos": [],
            "documents": [],
            "source": "migration_history",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.subequipments.insert_one(doc)
        count += 1
    return count


async def part_c_compteur(db, pmap):
    bauer01 = pmap.get("bauer01")
    if not bauer01:
        return "BAUER 01 introuvable"
    valeur = 7441.0  # dernière lecture historique (fichier Excel)
    eq = await db.equipments.find_one({"id": bauer01})
    ancienne = (eq or {}).get("compteur_horaire", 0)
    entry = {
        "date": datetime.now(timezone.utc).isoformat(),
        "valeur": valeur,
        "technicien": "Import historique",
        "ancienne_valeur": ancienne,
        "intervention": False,
        "source": "migration_history",
    }
    await db.equipments.update_one(
        {"id": bauer01},
        {"$set": {"compteur_horaire": valeur}, "$push": {"historique_compteur": entry}},
    )
    return f"BAUER 01 -> {valeur} h"


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]
    pmap, _ = await get_parent_map(db)
    a = await part_a_interventions(db)
    b = await part_b_sub_equipments(db, pmap)
    cc = await part_c_compteur(db, pmap)
    print(f"A) Interventions historiques créées: {a}")
    print(f"B) Sous-équipements créés (manomètres+soupapes): {b}")
    print(f"C) Compteur horaire: {cc}")
    print("Totaux:")
    print("  interventions:", await db.interventions.count_documents({}))
    print("  sub_equipments:", await db.subequipments.count_documents({}))
    print("  work_orders terminee:", await db.work_orders.count_documents({"statut": "terminee"}))


if __name__ == "__main__":
    asyncio.run(main())
