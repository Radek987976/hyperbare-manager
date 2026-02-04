from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.responses import StreamingResponse, FileResponse
import os
import logging
import io
import csv
import json
import shutil
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "equipments").mkdir(exist_ok=True)
(UPLOADS_DIR / "inspections").mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'hypermaint-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="HyperMaint GMAO API")
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

# User Models
class UserBase(BaseModel):
    email: EmailStr
    nom: str
    prenom: str
    role: str = Field(default="technicien", description="admin or technicien")

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Caisson Model
class CaissonBase(BaseModel):
    identifiant: str
    modele: str
    fabricant: str
    date_mise_en_service: str
    pression_maximale: float
    normes_applicables: List[str] = []
    description: Optional[str] = None

class CaissonCreate(CaissonBase):
    pass

class Caisson(CaissonBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Equipment Model
class EquipmentBase(BaseModel):
    type: str  # porte, joint, soupape, compresseur, capteur, systeme_securite
    reference: str
    numero_serie: str
    criticite: str = Field(default="normale", description="critique, haute, normale, basse")
    statut: str = Field(default="en_service", description="en_service, maintenance, hors_service")
    caisson_id: str
    description: Optional[str] = None
    date_installation: Optional[str] = None
    photos: List[str] = []  # Liste des URLs des photos
    documents: List[dict] = []  # Liste des documents PDF [{filename, url, uploaded_at}]

class EquipmentCreate(EquipmentBase):
    pass

class Equipment(EquipmentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Work Order Model
class WorkOrderBase(BaseModel):
    titre: str
    description: str
    type_maintenance: str  # preventive, corrective
    priorite: str = Field(default="normale", description="urgente, haute, normale, basse")
    statut: str = Field(default="planifiee", description="planifiee, en_cours, terminee, annulee")
    caisson_id: Optional[str] = None
    equipment_id: Optional[str] = None
    date_planifiee: str
    periodicite_jours: Optional[int] = None
    technicien_assigne: Optional[str] = None

class WorkOrderCreate(WorkOrderBase):
    pass

class WorkOrder(WorkOrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Intervention Model
class InterventionBase(BaseModel):
    work_order_id: str
    date_intervention: str
    technicien: str
    actions_realisees: str
    observations: Optional[str] = None
    pieces_utilisees: List[dict] = []  # [{spare_part_id, quantite}]
    duree_minutes: Optional[int] = None

class InterventionCreate(InterventionBase):
    pass

class Intervention(InterventionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Inspection (Contrôle réglementaire) Model
PERIODICITES = {
    "hebdomadaire": 7,
    "mensuel": 30,
    "trimestriel": 90,
    "semestriel": 180,
    "annuel": 365,
    "biannuel": 730,
    "triennal": 1095,
    "quinquennal": 1825,
    "decennal": 3650
}

class InspectionBase(BaseModel):
    titre: str
    type_controle: str
    periodicite: str = Field(default="annuel", description="hebdomadaire, mensuel, trimestriel, semestriel, annuel, biannuel, triennal, quinquennal, decennal")
    caisson_id: Optional[str] = None
    equipment_id: Optional[str] = None
    date_realisation: Optional[str] = None
    date_validite: Optional[str] = None  # Calculée automatiquement
    organisme_certificateur: Optional[str] = None
    resultat: Optional[str] = None
    observations: Optional[str] = None

class InspectionCreate(InspectionBase):
    pass

class Inspection(InspectionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Spare Part Model
class SparePartBase(BaseModel):
    nom: str
    reference_fabricant: str
    equipment_type: str  # type d'équipement concerné
    quantite_stock: int = 0
    seuil_minimum: int = 1
    emplacement: Optional[str] = None
    fournisseur: Optional[str] = None
    prix_unitaire: Optional[float] = None

class SparePartCreate(SparePartBase):
    pass

class SparePart(SparePartBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SparePartUpdate(BaseModel):
    quantite_stock: Optional[int] = None
    seuil_minimum: Optional[int] = None
    emplacement: Optional[str] = None
    fournisseur: Optional[str] = None
    prix_unitaire: Optional[float] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    user_obj = User(**user_dict)
    
    doc = user_obj.model_dump()
    doc["password_hash"] = hash_password(password)
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    
    token = create_access_token({"sub": user_obj.id, "email": user_obj.email, "role": user_obj.role})
    
    return TokenResponse(
        access_token=token,
        user={"id": user_obj.id, "email": user_obj.email, "nom": user_obj.nom, "prenom": user_obj.prenom, "role": user_obj.role}
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role"]})
    
    return TokenResponse(
        access_token=token,
        user={"id": user["id"], "email": user["email"], "nom": user["nom"], "prenom": user["prenom"], "role": user["role"]}
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ==================== USERS ROUTES (Admin only) ====================

@api_router.get("/users", response_model=List[dict])
async def get_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/users/technicians", response_model=List[dict])
async def get_technicians(current_user: dict = Depends(get_current_user)):
    """Get all users (for technician dropdown)"""
    users = await db.users.find({"is_active": True}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, admin: dict = Depends(require_admin)):
    if role not in ["admin", "technicien"]:
        raise HTTPException(status_code=400, detail="Rôle invalide")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Rôle mis à jour"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur supprimé"}

# ==================== CAISSON ROUTES ====================

@api_router.post("/caisson", response_model=Caisson)
async def create_caisson(data: CaissonCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.caisson.find_one({})
    if existing:
        raise HTTPException(status_code=400, detail="Un caisson existe déjà. Utilisez PUT pour modifier.")
    
    caisson = Caisson(**data.model_dump())
    doc = caisson.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.caisson.insert_one(doc)
    return caisson

@api_router.get("/caisson", response_model=Optional[Caisson])
async def get_caisson(current_user: dict = Depends(get_current_user)):
    caisson = await db.caisson.find_one({}, {"_id": 0})
    return caisson

@api_router.put("/caisson/{caisson_id}", response_model=Caisson)
async def update_caisson(caisson_id: str, data: CaissonCreate, current_user: dict = Depends(get_current_user)):
    result = await db.caisson.update_one({"id": caisson_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Caisson non trouvé")
    caisson = await db.caisson.find_one({"id": caisson_id}, {"_id": 0})
    return caisson

# ==================== EQUIPMENT ROUTES ====================

@api_router.post("/equipments", response_model=Equipment)
async def create_equipment(data: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    equipment = Equipment(**data.model_dump())
    doc = equipment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.equipments.insert_one(doc)
    return equipment

@api_router.get("/equipments", response_model=List[Equipment])
async def get_equipments(
    type: Optional[str] = None,
    statut: Optional[str] = None,
    criticite: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if type:
        query["type"] = type
    if statut:
        query["statut"] = statut
    if criticite:
        query["criticite"] = criticite
    
    equipments = await db.equipments.find(query, {"_id": 0}).to_list(1000)
    return equipments

@api_router.get("/equipments/{equipment_id}", response_model=Equipment)
async def get_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    equipment = await db.equipments.find_one({"id": equipment_id}, {"_id": 0})
    if not equipment:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    return equipment

@api_router.put("/equipments/{equipment_id}", response_model=Equipment)
async def update_equipment(equipment_id: str, data: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    result = await db.equipments.update_one({"id": equipment_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    equipment = await db.equipments.find_one({"id": equipment_id}, {"_id": 0})
    return equipment

@api_router.delete("/equipments/{equipment_id}")
async def delete_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.equipments.delete_one({"id": equipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    return {"message": "Équipement supprimé"}

# ==================== WORK ORDER ROUTES ====================

@api_router.post("/work-orders", response_model=WorkOrder)
async def create_work_order(data: WorkOrderCreate, current_user: dict = Depends(get_current_user)):
    work_order = WorkOrder(**data.model_dump())
    doc = work_order.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.work_orders.insert_one(doc)
    return work_order

@api_router.get("/work-orders", response_model=List[WorkOrder])
async def get_work_orders(
    statut: Optional[str] = None,
    type_maintenance: Optional[str] = None,
    priorite: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if statut:
        query["statut"] = statut
    if type_maintenance:
        query["type_maintenance"] = type_maintenance
    if priorite:
        query["priorite"] = priorite
    
    work_orders = await db.work_orders.find(query, {"_id": 0}).to_list(1000)
    return work_orders

@api_router.get("/work-orders/{work_order_id}", response_model=WorkOrder)
async def get_work_order(work_order_id: str, current_user: dict = Depends(get_current_user)):
    work_order = await db.work_orders.find_one({"id": work_order_id}, {"_id": 0})
    if not work_order:
        raise HTTPException(status_code=404, detail="Ordre de travail non trouvé")
    return work_order

@api_router.put("/work-orders/{work_order_id}", response_model=WorkOrder)
async def update_work_order(work_order_id: str, data: WorkOrderCreate, current_user: dict = Depends(get_current_user)):
    result = await db.work_orders.update_one({"id": work_order_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ordre de travail non trouvé")
    work_order = await db.work_orders.find_one({"id": work_order_id}, {"_id": 0})
    return work_order

@api_router.delete("/work-orders/{work_order_id}")
async def delete_work_order(work_order_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.work_orders.delete_one({"id": work_order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ordre de travail non trouvé")
    return {"message": "Ordre de travail supprimé"}

# ==================== INTERVENTION ROUTES ====================

@api_router.post("/interventions", response_model=Intervention)
async def create_intervention(data: InterventionCreate, current_user: dict = Depends(get_current_user)):
    # Décrémentation du stock des pièces utilisées
    for piece in data.pieces_utilisees:
        spare_part = await db.spare_parts.find_one({"id": piece.get("spare_part_id")})
        if spare_part:
            new_qty = spare_part["quantite_stock"] - piece.get("quantite", 0)
            await db.spare_parts.update_one(
                {"id": piece.get("spare_part_id")},
                {"$set": {"quantite_stock": max(0, new_qty)}}
            )
    
    intervention = Intervention(**data.model_dump())
    doc = intervention.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.interventions.insert_one(doc)
    
    # Update work order status
    await db.work_orders.update_one(
        {"id": data.work_order_id},
        {"$set": {"statut": "terminee"}}
    )
    
    return intervention

@api_router.get("/interventions", response_model=List[Intervention])
async def get_interventions(
    work_order_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if work_order_id:
        query["work_order_id"] = work_order_id
    
    interventions = await db.interventions.find(query, {"_id": 0}).to_list(1000)
    return interventions

@api_router.get("/interventions/{intervention_id}", response_model=Intervention)
async def get_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    intervention = await db.interventions.find_one({"id": intervention_id}, {"_id": 0})
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    return intervention

# ==================== INSPECTION ROUTES ====================

def calculate_next_date(date_realisation: str, periodicite: str) -> str:
    """Calculate next inspection date based on periodicity"""
    if not date_realisation:
        # Si pas de date de réalisation, partir d'aujourd'hui
        base_date = datetime.now(timezone.utc).date()
    else:
        base_date = datetime.strptime(date_realisation, "%Y-%m-%d").date()
    
    days = PERIODICITES.get(periodicite, 365)
    next_date = base_date + timedelta(days=days)
    return next_date.strftime("%Y-%m-%d")

@api_router.post("/inspections", response_model=Inspection)
async def create_inspection(data: InspectionCreate, current_user: dict = Depends(get_current_user)):
    data_dict = data.model_dump()
    # Calculer automatiquement la date de validité
    data_dict["date_validite"] = calculate_next_date(data_dict.get("date_realisation"), data_dict.get("periodicite", "annuel"))
    
    inspection = Inspection(**data_dict)
    doc = inspection.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.inspections.insert_one(doc)
    return inspection

@api_router.get("/inspections", response_model=List[Inspection])
async def get_inspections(current_user: dict = Depends(get_current_user)):
    inspections = await db.inspections.find({}, {"_id": 0}).to_list(1000)
    return inspections

@api_router.get("/inspections/{inspection_id}", response_model=Inspection)
async def get_inspection(inspection_id: str, current_user: dict = Depends(get_current_user)):
    inspection = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    if not inspection:
        raise HTTPException(status_code=404, detail="Contrôle non trouvé")
    return inspection

@api_router.put("/inspections/{inspection_id}", response_model=Inspection)
async def update_inspection(inspection_id: str, data: InspectionCreate, current_user: dict = Depends(get_current_user)):
    data_dict = data.model_dump()
    # Recalculer la date de validité si date_realisation ou periodicite change
    data_dict["date_validite"] = calculate_next_date(data_dict.get("date_realisation"), data_dict.get("periodicite", "annuel"))
    
    result = await db.inspections.update_one({"id": inspection_id}, {"$set": data_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contrôle non trouvé")
    inspection = await db.inspections.find_one({"id": inspection_id}, {"_id": 0})
    return inspection

@api_router.delete("/inspections/{inspection_id}")
async def delete_inspection(inspection_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.inspections.delete_one({"id": inspection_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contrôle non trouvé")
    return {"message": "Contrôle supprimé"}

# ==================== SPARE PARTS ROUTES ====================

@api_router.post("/spare-parts", response_model=SparePart)
async def create_spare_part(data: SparePartCreate, current_user: dict = Depends(get_current_user)):
    spare_part = SparePart(**data.model_dump())
    doc = spare_part.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.spare_parts.insert_one(doc)
    return spare_part

@api_router.get("/spare-parts", response_model=List[SparePart])
async def get_spare_parts(
    equipment_type: Optional[str] = None,
    low_stock: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if equipment_type:
        query["equipment_type"] = equipment_type
    
    spare_parts = await db.spare_parts.find(query, {"_id": 0}).to_list(1000)
    
    if low_stock:
        spare_parts = [p for p in spare_parts if p["quantite_stock"] <= p["seuil_minimum"]]
    
    return spare_parts

@api_router.get("/spare-parts/{spare_part_id}", response_model=SparePart)
async def get_spare_part(spare_part_id: str, current_user: dict = Depends(get_current_user)):
    spare_part = await db.spare_parts.find_one({"id": spare_part_id}, {"_id": 0})
    if not spare_part:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    return spare_part

@api_router.put("/spare-parts/{spare_part_id}", response_model=SparePart)
async def update_spare_part(spare_part_id: str, data: SparePartUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = await db.spare_parts.update_one({"id": spare_part_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    spare_part = await db.spare_parts.find_one({"id": spare_part_id}, {"_id": 0})
    return spare_part

@api_router.delete("/spare-parts/{spare_part_id}")
async def delete_spare_part(spare_part_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.spare_parts.delete_one({"id": spare_part_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    return {"message": "Pièce supprimée"}

# ==================== DASHBOARD / ALERTS ROUTES ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Count equipments by status
    equipments = await db.equipments.find({}, {"_id": 0}).to_list(1000)
    equipment_stats = {
        "total": len(equipments),
        "en_service": len([e for e in equipments if e.get("statut") == "en_service"]),
        "maintenance": len([e for e in equipments if e.get("statut") == "maintenance"]),
        "hors_service": len([e for e in equipments if e.get("statut") == "hors_service"])
    }
    
    # Work orders stats
    work_orders = await db.work_orders.find({}, {"_id": 0}).to_list(1000)
    work_order_stats = {
        "total": len(work_orders),
        "planifiee": len([w for w in work_orders if w.get("statut") == "planifiee"]),
        "en_cours": len([w for w in work_orders if w.get("statut") == "en_cours"]),
        "terminee": len([w for w in work_orders if w.get("statut") == "terminee"])
    }
    
    # Spare parts with low stock
    spare_parts = await db.spare_parts.find({}, {"_id": 0}).to_list(1000)
    low_stock_parts = [p for p in spare_parts if p["quantite_stock"] <= p["seuil_minimum"]]
    
    return {
        "equipment_stats": equipment_stats,
        "work_order_stats": work_order_stats,
        "low_stock_count": len(low_stock_parts),
        "total_spare_parts": len(spare_parts)
    }

@api_router.get("/dashboard/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    alerts = []
    today = datetime.now(timezone.utc).date()
    
    # Low stock alerts
    spare_parts = await db.spare_parts.find({}, {"_id": 0}).to_list(1000)
    for part in spare_parts:
        if part["quantite_stock"] <= part["seuil_minimum"]:
            alerts.append({
                "type": "stock_bas",
                "severity": "warning",
                "title": f"Stock bas: {part['nom']}",
                "description": f"Quantité: {part['quantite_stock']} / Seuil: {part['seuil_minimum']}",
                "item_id": part["id"],
                "item_type": "spare_part"
            })
    
    # Inspection expiration alerts (30 days before)
    inspections = await db.inspections.find({}, {"_id": 0}).to_list(1000)
    for inspection in inspections:
        try:
            expiry_date = datetime.strptime(inspection["date_validite"], "%Y-%m-%d").date()
            days_until_expiry = (expiry_date - today).days
            
            if days_until_expiry < 0:
                alerts.append({
                    "type": "controle_expire",
                    "severity": "critical",
                    "title": f"Contrôle expiré: {inspection['titre']}",
                    "description": f"Expiré depuis {abs(days_until_expiry)} jours",
                    "item_id": inspection["id"],
                    "item_type": "inspection"
                })
            elif days_until_expiry <= 30:
                alerts.append({
                    "type": "controle_proche",
                    "severity": "warning",
                    "title": f"Contrôle à renouveler: {inspection['titre']}",
                    "description": f"Expire dans {days_until_expiry} jours",
                    "item_id": inspection["id"],
                    "item_type": "inspection"
                })
        except (ValueError, KeyError):
            pass
    
    # Overdue work orders
    work_orders = await db.work_orders.find({"statut": {"$in": ["planifiee", "en_cours"]}}, {"_id": 0}).to_list(1000)
    for wo in work_orders:
        try:
            planned_date = datetime.strptime(wo["date_planifiee"], "%Y-%m-%d").date()
            if planned_date < today:
                days_overdue = (today - planned_date).days
                alerts.append({
                    "type": "maintenance_retard",
                    "severity": "critical" if days_overdue > 7 else "warning",
                    "title": f"Maintenance en retard: {wo['titre']}",
                    "description": f"En retard de {days_overdue} jours",
                    "item_id": wo["id"],
                    "item_type": "work_order"
                })
        except (ValueError, KeyError):
            pass
    
    # Equipment out of service
    equipments = await db.equipments.find({"statut": "hors_service"}, {"_id": 0}).to_list(1000)
    for eq in equipments:
        alerts.append({
            "type": "equipement_hs",
            "severity": "critical",
            "title": f"Équipement hors service: {eq['type']}",
            "description": f"Réf: {eq['reference']} - S/N: {eq['numero_serie']}",
            "item_id": eq["id"],
            "item_type": "equipment"
        })
    
    # Sort by severity
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda x: severity_order.get(x["severity"], 3))
    
    return alerts

@api_router.get("/dashboard/upcoming-maintenance")
async def get_upcoming_maintenance(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    work_orders = await db.work_orders.find(
        {"statut": {"$in": ["planifiee", "en_cours"]}},
        {"_id": 0}
    ).to_list(1000)
    
    upcoming = []
    for wo in work_orders:
        try:
            planned_date = datetime.strptime(wo["date_planifiee"], "%Y-%m-%d").date()
            days_diff = (planned_date - today).days
            wo["days_until"] = days_diff
            wo["is_overdue"] = days_diff < 0
            upcoming.append(wo)
        except (ValueError, KeyError):
            pass
    
    # Sort by date
    upcoming.sort(key=lambda x: x.get("days_until", 999))
    
    return upcoming[:10]  # Return next 10

# ==================== EXPORT ROUTES ====================

@api_router.get("/export/csv/{collection}")
async def export_csv(collection: str, current_user: dict = Depends(get_current_user)):
    valid_collections = ["equipments", "work_orders", "interventions", "inspections", "spare_parts"]
    if collection not in valid_collections:
        raise HTTPException(status_code=400, detail="Collection invalide")
    
    data = await db[collection].find({}, {"_id": 0}).to_list(10000)
    
    if not data:
        raise HTTPException(status_code=404, detail="Aucune donnée à exporter")
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={collection}.csv"}
    )

@api_router.get("/export/sql")
async def export_sql(current_user: dict = Depends(get_current_user)):
    collections = ["caisson", "equipments", "work_orders", "interventions", "inspections", "spare_parts", "users"]
    
    sql_output = []
    sql_output.append("-- HyperMaint GMAO Database Export")
    sql_output.append(f"-- Generated: {datetime.now(timezone.utc).isoformat()}")
    sql_output.append("")
    
    for coll_name in collections:
        data = await db[coll_name].find({}, {"_id": 0}).to_list(10000)
        if data:
            # Create table statement
            sample = data[0]
            columns = ", ".join([f"{k} TEXT" for k in sample.keys()])
            sql_output.append(f"CREATE TABLE IF NOT EXISTS {coll_name} ({columns});")
            sql_output.append("")
            
            # Insert statements
            for row in data:
                cols = ", ".join(row.keys())
                vals = ", ".join([f"'{str(v).replace(chr(39), chr(39)+chr(39))}'" for v in row.values()])
                sql_output.append(f"INSERT INTO {coll_name} ({cols}) VALUES ({vals});")
            sql_output.append("")
    
    output = "\n".join(sql_output)
    
    return StreamingResponse(
        iter([output]),
        media_type="application/sql",
        headers={"Content-Disposition": "attachment; filename=hypermaint_export.sql"}
    )

@api_router.get("/export/json")
async def export_json(current_user: dict = Depends(get_current_user)):
    collections = ["caisson", "equipments", "work_orders", "interventions", "inspections", "spare_parts"]
    
    export_data = {}
    for coll_name in collections:
        data = await db[coll_name].find({}, {"_id": 0}).to_list(10000)
        export_data[coll_name] = data
    
    output = json.dumps(export_data, indent=2, ensure_ascii=False, default=str)
    
    return StreamingResponse(
        iter([output]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=hypermaint_export.json"}
    )

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "HyperMaint GMAO API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
