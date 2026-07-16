"""
Génère les contrôles périodiques (inspections) pour les nouveaux sous-équipements
(manomètres + soupapes créés par la migration). Idempotent: source="subequip_controls".
- Manomètres: étalonnage métrologique (annuel; biennal pour certaines réf.)
- Soupapes: contrôle/tarage de sécurité (annuel)
- Les sous-équipements hors_service (réformés) sont ignorés.
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

PERIODICITE_JOURS = {"annuel": 365, "biannuel": 730}
BIENNAL_REFS = ["09/0660-1", "610T9", "CHPF 29", "CHPF 46", "CHPF 47",
                "CHPF 51", "CHPF 52", "CHPF 53", "CHPF 55", "CHPF 56"]


async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = c[os.environ["DB_NAME"]]

    await db.inspections.delete_many({"source": "subequip_controls"})

    subs = await db.subequipments.find({"source": "migration_history"}, {"_id": 0}).to_list(500)
    today = datetime.now(timezone.utc).date()
    docs = []
    for s in subs:
        if s.get("statut") == "hors_service":
            continue
        ref = s.get("reference") or ""
        is_mano = (s.get("nom") or "").lower().startswith("manom")
        if is_mano:
            periodicite = "biannuel" if any(b in ref for b in BIENNAL_REFS) else "annuel"
            titre = f"Étalonnage métrologique - {s.get('nom')}"
            type_controle = "Métrologie"
        else:
            periodicite = "annuel"
            titre = f"Contrôle périodique de sécurité - {s.get('nom')}"
            type_controle = "Sécurité"
        validite = today + timedelta(days=PERIODICITE_JOURS[periodicite])
        docs.append({
            "id": str(uuid.uuid4()),
            "titre": titre,
            "type_controle": type_controle,
            "periodicite": periodicite,
            "caisson_id": None,
            "equipment_id": s["id"],
            "date_realisation": None,
            "date_validite": validite.strftime("%Y-%m-%d"),
            "organisme_certificateur": None,
            "resultat": None,
            "observations": "Contrôle périodique généré automatiquement (nouvel organe)",
            "procedure_documents": [],
            "source": "subequip_controls",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if docs:
        await db.inspections.insert_many(docs)
    n_mano = sum(1 for d in docs if d["type_controle"] == "Métrologie")
    n_soup = len(docs) - n_mano
    print(f"Contrôles créés: {len(docs)} (manomètres: {n_mano}, soupapes: {n_soup})")
    print("Total inspections en base:", await db.inspections.count_documents({}))


if __name__ == "__main__":
    asyncio.run(main())
