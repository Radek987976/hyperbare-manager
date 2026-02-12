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
import asyncio
import resend
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Resend Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "equipments").mkdir(exist_ok=True)
(UPLOADS_DIR / "inspections").mkdir(exist_ok=True)
(UPLOADS_DIR / "subequipments").mkdir(exist_ok=True)
(UPLOADS_DIR / "spareparts").mkdir(exist_ok=True)
(UPLOADS_DIR / "workorders").mkdir(exist_ok=True)

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

# ==================== EMAIL SERVICE ====================

async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send email using Resend API"""
    if not RESEND_API_KEY:
        logging.warning("RESEND_API_KEY not configured - email not sent")
        return False
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {str(e)}")
        return False

def email_template(title: str, content: str, footer: str = "") -> str:
    """Generate HTML email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
                <td style="background-color: #005F73; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">HyperMaint GMAO</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px;">
                    <h2 style="color: #005F73; margin-top: 0;">{title}</h2>
                    {content}
                </td>
            </tr>
            <tr>
                <td style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
                    {footer if footer else "Cet email a été envoyé automatiquement par HyperMaint GMAO."}
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

async def send_welcome_email(user_email: str, user_name: str, password: str):
    """Send welcome email to newly created user"""
    content = f"""
    <p>Bonjour <strong>{user_name}</strong>,</p>
    <p>Votre compte HyperMaint GMAO a été créé avec succès.</p>
    <table style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; width: 100%;">
        <tr>
            <td style="padding: 10px;">
                <strong>Email :</strong> {user_email}<br>
                <strong>Mot de passe :</strong> {password}
            </td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
    <p>Connectez-vous dès maintenant pour commencer à utiliser l'application.</p>
    """
    await send_email(user_email, "Bienvenue sur HyperMaint GMAO", email_template("Bienvenue !", content))

async def send_access_approved_email(user_email: str, user_name: str):
    """Send email when access request is approved"""
    content = f"""
    <p>Bonjour <strong>{user_name}</strong>,</p>
    <p style="color: #28a745;"><strong>Bonne nouvelle !</strong> Votre demande d'accès à HyperMaint GMAO a été approuvée.</p>
    <p>Vous pouvez maintenant vous connecter avec vos identifiants.</p>
    """
    await send_email(user_email, "Accès approuvé - HyperMaint GMAO", email_template("Accès Approuvé ✓", content))

async def send_access_rejected_email(user_email: str, user_name: str):
    """Send email when access request is rejected"""
    content = f"""
    <p>Bonjour <strong>{user_name}</strong>,</p>
    <p style="color: #dc3545;">Nous avons le regret de vous informer que votre demande d'accès à HyperMaint GMAO a été refusée.</p>
    <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur.</p>
    """
    await send_email(user_email, "Demande d'accès refusée - HyperMaint GMAO", email_template("Demande Refusée", content))

async def send_maintenance_reminder_email(to_email: str, maintenance_title: str, equipment_ref: str, date_planifiee: str, days_left: int):
    """Send maintenance reminder email"""
    urgency_color = "#dc3545" if days_left <= 7 else "#ffc107" if days_left <= 14 else "#17a2b8"
    content = f"""
    <p>Une maintenance préventive est prévue prochainement :</p>
    <table style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; width: 100%; border-left: 4px solid {urgency_color};">
        <tr>
            <td style="padding: 10px;">
                <strong>Titre :</strong> {maintenance_title}<br>
                <strong>Équipement :</strong> {equipment_ref}<br>
                <strong>Date planifiée :</strong> {date_planifiee}<br>
                <strong style="color: {urgency_color};">Dans {days_left} jour(s)</strong>
            </td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Pensez à planifier cette intervention.</p>
    """
    await send_email(to_email, f"⏰ Rappel maintenance : {maintenance_title}", email_template("Maintenance à Venir", content))

async def send_maintenance_overdue_email(to_email: str, maintenance_title: str, equipment_ref: str, date_planifiee: str, days_overdue: int):
    """Send overdue maintenance alert email"""
    content = f"""
    <p style="color: #dc3545;"><strong>⚠️ ALERTE : Maintenance en retard !</strong></p>
    <table style="background-color: #fff5f5; padding: 15px; border-radius: 5px; width: 100%; border-left: 4px solid #dc3545;">
        <tr>
            <td style="padding: 10px;">
                <strong>Titre :</strong> {maintenance_title}<br>
                <strong>Équipement :</strong> {equipment_ref}<br>
                <strong>Date planifiée :</strong> {date_planifiee}<br>
                <strong style="color: #dc3545;">En retard de {days_overdue} jour(s)</strong>
            </td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Veuillez effectuer cette maintenance au plus vite.</p>
    """
    await send_email(to_email, f"🚨 URGENT - Maintenance en retard : {maintenance_title}", email_template("Maintenance en Retard", content))

async def send_low_stock_email(to_email: str, part_name: str, part_ref: str, current_stock: int, minimum_stock: int):
    """Send low stock alert email"""
    content = f"""
    <p style="color: #ffc107;"><strong>⚠️ Alerte stock bas</strong></p>
    <table style="background-color: #fff9e6; padding: 15px; border-radius: 5px; width: 100%; border-left: 4px solid #ffc107;">
        <tr>
            <td style="padding: 10px;">
                <strong>Pièce :</strong> {part_name}<br>
                <strong>Référence :</strong> {part_ref}<br>
                <strong>Stock actuel :</strong> <span style="color: #dc3545;">{current_stock}</span><br>
                <strong>Seuil minimum :</strong> {minimum_stock}
            </td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Pensez à réapprovisionner cette pièce.</p>
    """
    await send_email(to_email, f"📦 Stock bas : {part_name}", email_template("Alerte Stock Bas", content))

async def send_hour_counter_alert_email(to_email: str, equipment_ref: str, current_hours: float, threshold_hours: float, maintenance_title: str):
    """Send compressor hour counter alert email"""
    content = f"""
    <p style="color: #dc3545;"><strong>⚠️ Seuil compteur horaire atteint !</strong></p>
    <table style="background-color: #fff5f5; padding: 15px; border-radius: 5px; width: 100%; border-left: 4px solid #dc3545;">
        <tr>
            <td style="padding: 10px;">
                <strong>Équipement :</strong> {equipment_ref}<br>
                <strong>Compteur actuel :</strong> {current_hours:,.0f} h<br>
                <strong>Seuil de déclenchement :</strong> {threshold_hours:,.0f} h<br>
                <strong>Maintenance requise :</strong> {maintenance_title}
            </td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Une maintenance basée sur le compteur horaire doit être effectuée.</p>
    """
    await send_email(to_email, f"🔧 Compteur horaire : {equipment_ref} - Maintenance requise", email_template("Alerte Compteur Horaire", content))

# ==================== MODELS ====================

# User Models
ROLES = ["admin", "technicien", "invite"]

class UserBase(BaseModel):
    email: EmailStr
    nom: str
    prenom: str
    role: str = Field(default="invite", description="admin, technicien, or invite")

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = False  # Requires admin approval
    is_approved: bool = False  # Approval status

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

# Equipment Type Model (Dynamic types)
class EquipmentTypeBase(BaseModel):
    nom: str
    description: Optional[str] = None
    icon: Optional[str] = None

class EquipmentTypeCreate(EquipmentTypeBase):
    pass

class EquipmentType(EquipmentTypeBase):
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
    compteur_horaire: Optional[float] = None  # Compteur horaire pour les compresseurs (en heures)
    historique_compteur: List[dict] = []  # Historique des relevés [{date, valeur, technicien}]

class EquipmentCreate(EquipmentBase):
    pass

class Equipment(EquipmentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Sub-Equipment Model (Sous-équipement)
class SubEquipmentBase(BaseModel):
    nom: str
    reference: str
    numero_serie: Optional[str] = None
    parent_equipment_id: str  # Lien vers l'équipement parent
    description: Optional[str] = None
    date_installation: Optional[str] = None
    statut: str = Field(default="en_service", description="en_service, maintenance, hors_service")
    photos: List[str] = []
    documents: List[dict] = []

class SubEquipmentCreate(SubEquipmentBase):
    pass

class SubEquipment(SubEquipmentBase):
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
    # Pour les compresseurs - maintenance basée sur le compteur horaire
    periodicite_heures: Optional[int] = None  # Périodicité en heures de fonctionnement
    compteur_declenchement: Optional[float] = None  # Compteur horaire au moment où la maintenance doit être faite
    technicien_assigne: Optional[str] = None
    photos: List[str] = []
    documents: List[dict] = []

class WorkOrderCreate(WorkOrderBase):
    pass

class WorkOrder(WorkOrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Intervention Model
class InterventionBase(BaseModel):
    work_order_id: Optional[str] = None  # Pour maintenance curative (ordre de travail)
    maintenance_preventive_id: Optional[str] = None  # Pour maintenance préventive (inspection)
    type_intervention: str = Field(default="curative", description="curative ou preventive")
    date_intervention: str
    technicien: str
    actions_realisees: str
    observations: Optional[str] = None
    pieces_utilisees: List[dict] = []  # [{spare_part_id, quantite}]
    duree_minutes: Optional[int] = None
    compteur_horaire: Optional[float] = None  # Compteur horaire au moment de l'intervention (pour compresseurs)
    equipment_id: Optional[str] = None  # Équipement concerné

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
    procedure_documents: List[dict] = []  # Liste des procédures PDF [{filename, url, uploaded_at}]

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
    photos: List[str] = []
    documents: List[dict] = []

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

async def require_technicien_or_admin(current_user: dict = Depends(get_current_user)):
    """Allow admin and technicien roles - can create/modify but technicien cannot delete"""
    if current_user.get("role") not in ["admin", "technicien"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et techniciens")
    return current_user

async def require_active_user(current_user: dict = Depends(get_current_user)):
    """Ensure user is active and approved"""
    if not current_user.get("is_active") or not current_user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Compte non activé. Veuillez contacter l'administrateur.")
    return current_user

def can_delete(user: dict) -> bool:
    """Only admin can delete"""
    return user.get("role") == "admin"

def can_modify(user: dict) -> bool:
    """Admin and technicien can modify"""
    return user.get("role") in ["admin", "technicien"]

def can_export(user: dict) -> bool:
    """Only admin and technicien can export"""
    return user.get("role") in ["admin", "technicien"]

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    
    # Check if first user - make them admin and auto-approve
    user_count = await db.users.count_documents({})
    if user_count == 0:
        user_dict["role"] = "admin"
        user_dict["is_active"] = True
        user_dict["is_approved"] = True
    else:
        user_dict["role"] = "invite"  # New users start as invite
        user_dict["is_active"] = False
        user_dict["is_approved"] = False
    
    user_obj = User(**user_dict)
    
    doc = user_obj.model_dump()
    doc["password_hash"] = hash_password(password)
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    
    # If not approved, return message instead of token
    if not user_obj.is_approved:
        return {
            "message": "Inscription réussie. Votre compte est en attente d'approbation par l'administrateur.",
            "pending_approval": True,
            "user": {"id": user_obj.id, "email": user_obj.email, "nom": user_obj.nom, "prenom": user_obj.prenom}
        }
    
    token = create_access_token({"sub": user_obj.id, "email": user_obj.email, "role": user_obj.role})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_obj.id, "email": user_obj.email, "nom": user_obj.nom, "prenom": user_obj.prenom, "role": user_obj.role}
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Check if user is approved and active
    if not user.get("is_approved", False):
        raise HTTPException(status_code=403, detail="Votre compte est en attente d'approbation par l'administrateur")
    
    if not user.get("is_active", False):
        raise HTTPException(status_code=403, detail="Votre compte a été suspendu. Contactez l'administrateur.")
    
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

@api_router.get("/users/pending", response_model=List[dict])
async def get_pending_users(admin: dict = Depends(require_admin)):
    """Get users pending approval"""
    users = await db.users.find({"is_approved": False}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/users/technicians", response_model=List[dict])
async def get_technicians(current_user: dict = Depends(get_current_user)):
    """Get all active users (for technician dropdown)"""
    users = await db.users.find({"is_active": True, "is_approved": True}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

# Admin create user
class AdminUserCreate(BaseModel):
    email: str
    nom: str
    prenom: str
    password: str
    role: str = "technicien"

@api_router.post("/users/create")
async def admin_create_user(user_data: AdminUserCreate, admin: dict = Depends(require_admin)):
    """Admin creates a new user directly (pre-approved)"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    if user_data.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Choix: {', '.join(ROLES)}")
    
    # Create user (pre-approved)
    new_user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "nom": user_data.nom,
        "prenom": user_data.prenom,
        "password_hash": pwd_context.hash(user_data.password),
        "role": user_data.role,
        "is_active": True,
        "is_approved": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Send welcome email with credentials
    await send_welcome_email(
        user_data.email, 
        f"{user_data.prenom} {user_data.nom}", 
        user_data.password
    )
    
    # Return user without password
    del new_user["password_hash"]
    return {"message": "Utilisateur créé avec succès", "user": new_user}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, admin: dict = Depends(require_admin)):
    if role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Choix: {', '.join(ROLES)}")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Rôle mis à jour"}

@api_router.put("/users/{user_id}/approve")
async def approve_user(user_id: str, admin: dict = Depends(require_admin)):
    """Approve a pending user"""
    result = await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"is_approved": True, "is_active": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur approuvé"}

@api_router.put("/users/{user_id}/reject")
async def reject_user(user_id: str, admin: dict = Depends(require_admin)):
    """Reject a pending user (delete them)"""
    result = await db.users.delete_one({"id": user_id, "is_approved": False})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé ou déjà approuvé")
    return {"message": "Demande refusée"}

@api_router.put("/users/{user_id}/suspend")
async def suspend_user(user_id: str, admin: dict = Depends(require_admin)):
    """Suspend a user"""
    # Prevent admin from suspending themselves
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous suspendre vous-même")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur suspendu"}

@api_router.put("/users/{user_id}/activate")
async def activate_user(user_id: str, admin: dict = Depends(require_admin)):
    """Reactivate a suspended user"""
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur réactivé"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    # Prevent admin from deleting themselves
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur supprimé"}

@api_router.get("/users/permissions")
async def get_user_permissions(current_user: dict = Depends(get_current_user)):
    """Return permissions for the current user based on their role"""
    role = current_user.get("role", "invite")
    
    permissions = {
        "can_create": role in ["admin", "technicien"],
        "can_modify": role in ["admin", "technicien"],
        "can_delete": role == "admin",
        "can_export": role in ["admin", "technicien"],
        "can_manage_users": role == "admin",
        "role": role
    }
    
    return permissions

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

# ==================== EQUIPMENT TYPES ROUTES ====================

DEFAULT_EQUIPMENT_TYPES = [
    {"code": "porte", "nom": "Porte", "description": "Portes du caisson"},
    {"code": "joint", "nom": "Joint", "description": "Joints d'étanchéité"},
    {"code": "soupape", "nom": "Soupape", "description": "Soupapes de sécurité"},
    {"code": "compresseur", "nom": "Compresseur", "description": "Compresseurs d'air"},
    {"code": "capteur", "nom": "Capteur", "description": "Capteurs de pression/température"},
    {"code": "systeme_securite", "nom": "Système de sécurité", "description": "Systèmes de sécurité"},
]

@api_router.get("/equipment-types", response_model=List[EquipmentType])
async def get_equipment_types(current_user: dict = Depends(get_current_user)):
    types = await db.equipment_types.find({}, {"_id": 0}).to_list(1000)
    # Si aucun type, initialiser avec les types par défaut
    if not types:
        for t in DEFAULT_EQUIPMENT_TYPES:
            eq_type = EquipmentType(**t)
            doc = eq_type.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.equipment_types.insert_one(doc)
        types = await db.equipment_types.find({}, {"_id": 0}).to_list(1000)
    return types

@api_router.post("/equipment-types", response_model=EquipmentType)
async def create_equipment_type(data: EquipmentTypeCreate, current_user: dict = Depends(get_current_user)):
    # Vérifier que le code n'existe pas déjà
    existing = await db.equipment_types.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Un type avec ce code existe déjà")
    
    eq_type = EquipmentType(**data.model_dump())
    doc = eq_type.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.equipment_types.insert_one(doc)
    return eq_type

@api_router.put("/equipment-types/{type_id}", response_model=EquipmentType)
async def update_equipment_type(type_id: str, data: EquipmentTypeCreate, current_user: dict = Depends(get_current_user)):
    result = await db.equipment_types.update_one({"id": type_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Type d'équipement non trouvé")
    eq_type = await db.equipment_types.find_one({"id": type_id}, {"_id": 0})
    return eq_type

@api_router.delete("/equipment-types/{type_id}")
async def delete_equipment_type(type_id: str, current_user: dict = Depends(get_current_user)):
    # Vérifier qu'aucun équipement n'utilise ce type
    eq_type = await db.equipment_types.find_one({"id": type_id})
    if eq_type:
        count = await db.equipments.count_documents({"type": eq_type["code"]})
        if count > 0:
            raise HTTPException(status_code=400, detail=f"Impossible de supprimer: {count} équipement(s) utilisent ce type")
    
    result = await db.equipment_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Type d'équipement non trouvé")
    return {"message": "Type d'équipement supprimé"}

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
    # Supprimer aussi les sous-équipements liés
    await db.subequipments.delete_many({"parent_equipment_id": equipment_id})
    return {"message": "Équipement supprimé"}

# Route pour mettre à jour le compteur horaire d'un compresseur
class CompteurHoraireUpdate(BaseModel):
    compteur_horaire: float
    technicien: Optional[str] = None

@api_router.put("/equipments/{equipment_id}/compteur-horaire")
async def update_compteur_horaire(
    equipment_id: str, 
    data: CompteurHoraireUpdate, 
    current_user: dict = Depends(get_current_user)
):
    equipment = await db.equipments.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    if equipment.get("type") != "compresseur":
        raise HTTPException(status_code=400, detail="Le compteur horaire n'est disponible que pour les compresseurs")
    
    # Ajouter à l'historique
    historique_entry = {
        "date": datetime.now(timezone.utc).isoformat(),
        "valeur": data.compteur_horaire,
        "technicien": data.technicien or current_user.get("email"),
        "ancienne_valeur": equipment.get("compteur_horaire", 0)
    }
    
    await db.equipments.update_one(
        {"id": equipment_id},
        {
            "$set": {"compteur_horaire": data.compteur_horaire},
            "$push": {"historique_compteur": historique_entry}
        }
    )
    
    # Vérifier s'il y a des maintenances préventives basées sur les heures à déclencher
    maintenances = await db.work_orders.find({
        "equipment_id": equipment_id,
        "periodicite_heures": {"$ne": None},
        "statut": {"$in": ["planifiee", "terminee"]}
    }).to_list(100)
    
    alerts = []
    for wo in maintenances:
        compteur_declenchement = wo.get("compteur_declenchement", 0)
        if data.compteur_horaire >= compteur_declenchement and wo.get("statut") == "planifiee":
            alerts.append({
                "work_order_id": wo["id"],
                "titre": wo["titre"],
                "message": f"Maintenance à effectuer: compteur {data.compteur_horaire}h >= seuil {compteur_declenchement}h"
            })
    
    updated = await db.equipments.find_one({"id": equipment_id}, {"_id": 0})
    return {"equipment": updated, "alerts": alerts}

# ==================== SUB-EQUIPMENT ROUTES ====================

@api_router.post("/subequipments", response_model=SubEquipment)
async def create_subequipment(data: SubEquipmentCreate, current_user: dict = Depends(get_current_user)):
    # Vérifier que l'équipement parent existe
    parent = await db.equipments.find_one({"id": data.parent_equipment_id})
    if not parent:
        raise HTTPException(status_code=404, detail="Équipement parent non trouvé")
    
    subequipment = SubEquipment(**data.model_dump())
    doc = subequipment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.subequipments.insert_one(doc)
    return subequipment

@api_router.get("/subequipments", response_model=List[SubEquipment])
async def get_subequipments(
    parent_equipment_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if parent_equipment_id:
        query["parent_equipment_id"] = parent_equipment_id
    
    subequipments = await db.subequipments.find(query, {"_id": 0}).to_list(1000)
    return subequipments

@api_router.get("/subequipments/{subequipment_id}", response_model=SubEquipment)
async def get_subequipment(subequipment_id: str, current_user: dict = Depends(get_current_user)):
    subequipment = await db.subequipments.find_one({"id": subequipment_id}, {"_id": 0})
    if not subequipment:
        raise HTTPException(status_code=404, detail="Sous-équipement non trouvé")
    return subequipment

@api_router.put("/subequipments/{subequipment_id}", response_model=SubEquipment)
async def update_subequipment(subequipment_id: str, data: SubEquipmentCreate, current_user: dict = Depends(get_current_user)):
    result = await db.subequipments.update_one({"id": subequipment_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sous-équipement non trouvé")
    subequipment = await db.subequipments.find_one({"id": subequipment_id}, {"_id": 0})
    return subequipment

@api_router.delete("/subequipments/{subequipment_id}")
async def delete_subequipment(subequipment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.subequipments.delete_one({"id": subequipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sous-équipement non trouvé")
    return {"message": "Sous-équipement supprimé"}

# Sub-equipment file uploads
@api_router.post("/subequipments/{subequipment_id}/photos")
async def upload_subequipment_photo(
    subequipment_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    subequipment = await db.subequipments.find_one({"id": subequipment_id})
    if not subequipment:
        raise HTTPException(status_code=404, detail="Sous-équipement non trouvé")
    
    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        raise HTTPException(status_code=400, detail="Format non supporté")
    
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "subequipments" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/api/uploads/subequipments/{unique_filename}"
    await db.subequipments.update_one(
        {"id": subequipment_id},
        {"$push": {"photos": photo_url}}
    )
    return {"filename": file.filename, "url": photo_url}

@api_router.post("/subequipments/{subequipment_id}/documents")
async def upload_subequipment_document(
    subequipment_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    subequipment = await db.subequipments.find_one({"id": subequipment_id})
    if not subequipment:
        raise HTTPException(status_code=404, detail="Sous-équipement non trouvé")
    
    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "subequipments" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc_url = f"/api/uploads/subequipments/{unique_filename}"
    doc_info = {
        "filename": file.filename,
        "url": doc_url,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subequipments.update_one(
        {"id": subequipment_id},
        {"$push": {"documents": doc_info}}
    )
    return doc_info

@api_router.delete("/subequipments/{subequipment_id}/photos")
async def delete_subequipment_photo(
    subequipment_id: str,
    photo_url: str,
    current_user: dict = Depends(get_current_user)
):
    await db.subequipments.update_one(
        {"id": subequipment_id},
        {"$pull": {"photos": photo_url}}
    )
    filename = photo_url.split("/")[-1]
    file_path = UPLOADS_DIR / "subequipments" / filename
    if file_path.exists():
        file_path.unlink()
    return {"message": "Photo supprimée"}

@api_router.delete("/subequipments/{subequipment_id}/documents")
async def delete_subequipment_document(
    subequipment_id: str,
    doc_url: str,
    current_user: dict = Depends(get_current_user)
):
    await db.subequipments.update_one(
        {"id": subequipment_id},
        {"$pull": {"documents": {"url": doc_url}}}
    )
    filename = doc_url.split("/")[-1]
    file_path = UPLOADS_DIR / "subequipments" / filename
    if file_path.exists():
        file_path.unlink()
    return {"message": "Document supprimé"}

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

# Work orders file uploads
@api_router.post("/work-orders/{work_order_id}/photos")
async def upload_work_order_photo(
    work_order_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    work_order = await db.work_orders.find_one({"id": work_order_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Maintenance non trouvée")
    
    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        raise HTTPException(status_code=400, detail="Format non supporté")
    
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "workorders" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/api/uploads/workorders/{unique_filename}"
    await db.work_orders.update_one(
        {"id": work_order_id},
        {"$push": {"photos": photo_url}}
    )
    return {"filename": file.filename, "url": photo_url}

@api_router.post("/work-orders/{work_order_id}/documents")
async def upload_work_order_document(
    work_order_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    work_order = await db.work_orders.find_one({"id": work_order_id})
    if not work_order:
        raise HTTPException(status_code=404, detail="Maintenance non trouvée")
    
    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "workorders" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc_url = f"/api/uploads/workorders/{unique_filename}"
    doc_info = {
        "filename": file.filename,
        "url": doc_url,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.work_orders.update_one(
        {"id": work_order_id},
        {"$push": {"documents": doc_info}}
    )
    return doc_info

@api_router.delete("/work-orders/{work_order_id}/photos")
async def delete_work_order_photo(
    work_order_id: str,
    photo_url: str,
    current_user: dict = Depends(get_current_user)
):
    await db.work_orders.update_one(
        {"id": work_order_id},
        {"$pull": {"photos": photo_url}}
    )
    filename = photo_url.split("/")[-1]
    file_path = UPLOADS_DIR / "workorders" / filename
    if file_path.exists():
        file_path.unlink()
    return {"message": "Photo supprimée"}

@api_router.delete("/work-orders/{work_order_id}/documents")
async def delete_work_order_document(
    work_order_id: str,
    doc_url: str,
    current_user: dict = Depends(get_current_user)
):
    await db.work_orders.update_one(
        {"id": work_order_id},
        {"$pull": {"documents": {"url": doc_url}}}
    )
    filename = doc_url.split("/")[-1]
    file_path = UPLOADS_DIR / "workorders" / filename
    if file_path.exists():
        file_path.unlink()
    return {"message": "Document supprimé"}

# ==================== INTERVENTION ROUTES ====================

@api_router.post("/interventions", response_model=Intervention)
async def create_intervention(data: InterventionCreate, current_user: dict = Depends(get_current_user)):
    # Récupérer l'équipement concerné (depuis work_order ou directement)
    equipment_id = data.equipment_id
    if not equipment_id:
        if data.work_order_id:
            wo = await db.work_orders.find_one({"id": data.work_order_id})
            if wo:
                equipment_id = wo.get("equipment_id")
        elif data.maintenance_preventive_id:
            wo = await db.work_orders.find_one({"id": data.maintenance_preventive_id})
            if wo:
                equipment_id = wo.get("equipment_id")
    
    # Mettre à jour le compteur horaire si fourni et si c'est un compresseur
    if data.compteur_horaire is not None and equipment_id:
        equipment = await db.equipments.find_one({"id": equipment_id})
        if equipment and equipment.get("type") == "compresseur":
            # Mettre à jour le compteur horaire de l'équipement
            historique_entry = {
                "date": datetime.now(timezone.utc).isoformat(),
                "valeur": data.compteur_horaire,
                "technicien": data.technicien,
                "ancienne_valeur": equipment.get("compteur_horaire", 0),
                "intervention": True
            }
            await db.equipments.update_one(
                {"id": equipment_id},
                {
                    "$set": {"compteur_horaire": data.compteur_horaire},
                    "$push": {"historique_compteur": historique_entry}
                }
            )
    
    # Décrémentation du stock des pièces utilisées
    pieces_details = []
    for piece in data.pieces_utilisees:
        spare_part = await db.spare_parts.find_one({"id": piece.get("spare_part_id")})
        if spare_part:
            quantite = piece.get("quantite", 0)
            new_qty = spare_part["quantite_stock"] - quantite
            await db.spare_parts.update_one(
                {"id": piece.get("spare_part_id")},
                {"$set": {"quantite_stock": max(0, new_qty)}}
            )
            pieces_details.append({
                "spare_part_id": piece.get("spare_part_id"),
                "nom": spare_part["nom"],
                "quantite": quantite,
                "stock_avant": spare_part["quantite_stock"],
                "stock_apres": max(0, new_qty)
            })
    
    # Créer l'intervention avec l'equipment_id
    intervention_data = data.model_dump()
    intervention_data["equipment_id"] = equipment_id
    intervention = Intervention(**intervention_data)
    doc = intervention.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.interventions.insert_one(doc)
    
    # Si maintenance curative (ordre de travail)
    if data.type_intervention == "curative" and data.work_order_id:
        await db.work_orders.update_one(
            {"id": data.work_order_id},
            {"$set": {"statut": "terminee"}}
        )
    
    # Si maintenance préventive, mettre à jour le work order ET recalculer la prochaine échéance
    if data.type_intervention == "preventive" and data.maintenance_preventive_id:
        # Récupérer le work order préventif
        work_order = await db.work_orders.find_one({"id": data.maintenance_preventive_id})
        if work_order:
            # Marquer comme terminée
            await db.work_orders.update_one(
                {"id": data.maintenance_preventive_id},
                {"$set": {"statut": "terminee"}}
            )
            
            # Si périodicité définie, créer automatiquement la prochaine maintenance
            if work_order.get("periodicite_jours") or work_order.get("periodicite_heures"):
                from datetime import timedelta
                
                # Calculer la prochaine date
                if work_order.get("periodicite_jours"):
                    next_date = datetime.strptime(data.date_intervention, "%Y-%m-%d") + timedelta(days=work_order["periodicite_jours"])
                    next_date_str = next_date.strftime("%Y-%m-%d")
                else:
                    next_date_str = data.date_intervention  # Pour les heures, on garde la même date
                
                # Calculer le prochain compteur de déclenchement si basé sur les heures
                next_compteur = None
                if work_order.get("periodicite_heures"):
                    equipment = await db.equipments.find_one({"id": work_order.get("equipment_id")})
                    if equipment:
                        current_compteur = equipment.get("compteur_horaire", 0)
                        next_compteur = current_compteur + work_order["periodicite_heures"]
                
                # Créer le nouveau work order
                new_wo = WorkOrder(
                    titre=work_order["titre"],
                    description=work_order["description"],
                    type_maintenance="preventive",
                    priorite=work_order.get("priorite", "normale"),
                    statut="planifiee",
                    caisson_id=work_order.get("caisson_id"),
                    equipment_id=work_order.get("equipment_id"),
                    date_planifiee=next_date_str,
                    periodicite_jours=work_order.get("periodicite_jours"),
                    periodicite_heures=work_order.get("periodicite_heures"),
                    compteur_declenchement=next_compteur,
                    technicien_assigne=work_order.get("technicien_assigne")
                )
                new_doc = new_wo.model_dump()
                new_doc["created_at"] = new_doc["created_at"].isoformat()
                await db.work_orders.insert_one(new_doc)
    
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

# Spare parts file uploads
@api_router.post("/spare-parts/{spare_part_id}/photos")
async def upload_spare_part_photo(
    spare_part_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    spare_part = await db.spare_parts.find_one({"id": spare_part_id})
    if not spare_part:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    
    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        raise HTTPException(status_code=400, detail="Format non supporté")
    
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "spareparts" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_url = f"/api/uploads/spareparts/{unique_filename}"
    await db.spare_parts.update_one(
        {"id": spare_part_id},
        {"$push": {"photos": photo_url}}
    )
    return {"filename": file.filename, "url": photo_url}

@api_router.post("/spare-parts/{spare_part_id}/documents")
async def upload_spare_part_document(
    spare_part_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    spare_part = await db.spare_parts.find_one({"id": spare_part_id})
    if not spare_part:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")
    
    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "spareparts" / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    doc_url = f"/api/uploads/spareparts/{unique_filename}"
    doc_info = {
        "filename": file.filename,
        "url": doc_url,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.spare_parts.update_one(
        {"id": spare_part_id},
        {"$push": {"documents": doc_info}}
    )
    return doc_info

@api_router.delete("/spare-parts/{spare_part_id}/photos")
async def delete_spare_part_photo(
    spare_part_id: str,
    photo_url: str,
    current_user: dict = Depends(get_current_user)
):
    await db.spare_parts.update_one(
        {"id": spare_part_id},
        {"$pull": {"photos": photo_url}}
    )
    filename = photo_url.split("/")[-1]
    file_path = UPLOADS_DIR / "spareparts" / filename
    if file_path.exists():
        file_path.unlink()
    return {"message": "Photo supprimée"}

@api_router.delete("/spare-parts/{spare_part_id}/documents")
async def delete_spare_part_document(
    spare_part_id: str,
    doc_url: str,
    current_user: dict = Depends(get_current_user)
):
    await db.spare_parts.update_one(
        {"id": spare_part_id},
        {"$pull": {"documents": {"url": doc_url}}}
    )
    filename = doc_url.split("/")[-1]
    file_path = UPLOADS_DIR / "spareparts" / filename
    if file_path.exists():
        file_path.unlink()
    return {"message": "Document supprimé"}

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
    
    # Compresseurs avec compteur horaire
    compresseurs = [e for e in equipments if e.get("type") == "compresseur"]
    compresseurs_stats = []
    for comp in compresseurs:
        compresseurs_stats.append({
            "id": comp.get("id"),
            "reference": comp.get("reference"),
            "numero_serie": comp.get("numero_serie"),
            "compteur_horaire": comp.get("compteur_horaire", 0),
            "statut": comp.get("statut")
        })
    
    return {
        "equipment_stats": equipment_stats,
        "work_order_stats": work_order_stats,
        "low_stock_count": len(low_stock_parts),
        "total_spare_parts": len(spare_parts),
        "compresseurs": compresseurs_stats
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

@api_router.get("/dashboard/calendar")
async def get_maintenance_calendar(current_user: dict = Depends(get_current_user)):
    """Retourne les maintenances planifiées sur 52 semaines pour le calendrier"""
    today = datetime.now(timezone.utc).date()
    end_date = today + timedelta(weeks=52)
    
    work_orders = await db.work_orders.find(
        {"statut": {"$in": ["planifiee", "en_cours", "terminee"]}},
        {"_id": 0}
    ).to_list(1000)
    
    calendar_data = []
    
    for wo in work_orders:
        try:
            planned_date = datetime.strptime(wo["date_planifiee"], "%Y-%m-%d").date()
            # Inclure les maintenances passées (4 semaines) et futures (52 semaines)
            if planned_date >= today - timedelta(weeks=4) and planned_date <= end_date:
                # Calculer le numéro de semaine
                week_number = planned_date.isocalendar()[1]
                year = planned_date.year
                
                calendar_data.append({
                    "id": wo["id"],
                    "titre": wo["titre"],
                    "type_maintenance": wo.get("type_maintenance", "preventive"),
                    "date_planifiee": wo["date_planifiee"],
                    "statut": wo["statut"],
                    "equipment_id": wo.get("equipment_id"),
                    "priorite": wo.get("priorite", "normale"),
                    "week_number": week_number,
                    "year": year,
                    "periodicite_jours": wo.get("periodicite_jours"),
                    "periodicite_heures": wo.get("periodicite_heures")
                })
        except (ValueError, KeyError):
            pass
    
    # Trier par date
    calendar_data.sort(key=lambda x: x["date_planifiee"])
    
    return calendar_data

# ==================== EXPORT ROUTES ====================

@api_router.get("/export/csv/{collection}")
async def export_csv(collection: str, current_user: dict = Depends(get_current_user)):
    # Check permission
    if not can_export(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et techniciens")
    
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
    # Check permission
    if not can_export(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et techniciens")
    
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
    # Check permission
    if not can_export(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et techniciens")
    
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

# ==================== FILE UPLOAD ROUTES ====================

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_DOC_EXTENSIONS = {".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()

@api_router.post("/equipments/{equipment_id}/photos")
async def upload_equipment_photo(
    equipment_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a photo for an equipment"""
    # Verify equipment exists
    equipment = await db.equipments.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    # Validate file extension
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Format non supporté. Formats acceptés: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "equipments" / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update equipment in database
    photo_url = f"/api/uploads/equipments/{unique_filename}"
    await db.equipments.update_one(
        {"id": equipment_id},
        {"$push": {"photos": photo_url}}
    )
    
    return {"filename": file.filename, "url": photo_url}

@api_router.post("/equipments/{equipment_id}/documents")
async def upload_equipment_document(
    equipment_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a PDF document for an equipment"""
    # Verify equipment exists
    equipment = await db.equipments.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    # Validate file extension
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "equipments" / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update equipment in database
    doc_url = f"/api/uploads/equipments/{unique_filename}"
    doc_info = {
        "filename": file.filename,
        "url": doc_url,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.equipments.update_one(
        {"id": equipment_id},
        {"$push": {"documents": doc_info}}
    )
    
    return doc_info

@api_router.delete("/equipments/{equipment_id}/photos")
async def delete_equipment_photo(
    equipment_id: str,
    photo_url: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a photo from an equipment"""
    # Remove from database
    await db.equipments.update_one(
        {"id": equipment_id},
        {"$pull": {"photos": photo_url}}
    )
    
    # Delete file
    filename = photo_url.split("/")[-1]
    file_path = UPLOADS_DIR / "equipments" / filename
    if file_path.exists():
        file_path.unlink()
    
    return {"message": "Photo supprimée"}

@api_router.delete("/equipments/{equipment_id}/documents")
async def delete_equipment_document(
    equipment_id: str,
    doc_url: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document from an equipment"""
    # Remove from database
    await db.equipments.update_one(
        {"id": equipment_id},
        {"$pull": {"documents": {"url": doc_url}}}
    )
    
    # Delete file
    filename = doc_url.split("/")[-1]
    file_path = UPLOADS_DIR / "equipments" / filename
    if file_path.exists():
        file_path.unlink()
    
    return {"message": "Document supprimé"}

@api_router.post("/inspections/{inspection_id}/procedures")
async def upload_inspection_procedure(
    inspection_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a procedure PDF for an inspection"""
    # Verify inspection exists
    inspection = await db.inspections.find_one({"id": inspection_id})
    if not inspection:
        raise HTTPException(status_code=404, detail="Contrôle non trouvé")
    
    # Validate file extension
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = UPLOADS_DIR / "inspections" / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update inspection in database
    doc_url = f"/api/uploads/inspections/{unique_filename}"
    doc_info = {
        "filename": file.filename,
        "url": doc_url,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.inspections.update_one(
        {"id": inspection_id},
        {"$push": {"procedure_documents": doc_info}}
    )
    
    return doc_info

@api_router.delete("/inspections/{inspection_id}/procedures")
async def delete_inspection_procedure(
    inspection_id: str,
    doc_url: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a procedure from an inspection"""
    # Remove from database
    await db.inspections.update_one(
        {"id": inspection_id},
        {"$pull": {"procedure_documents": {"url": doc_url}}}
    )
    
    # Delete file
    filename = doc_url.split("/")[-1]
    file_path = UPLOADS_DIR / "inspections" / filename
    if file_path.exists():
        file_path.unlink()
    
    return {"message": "Procédure supprimée"}

# Serve uploaded files
@api_router.get("/uploads/{folder}/{filename}")
async def get_uploaded_file(folder: str, filename: str):
    """Serve uploaded files"""
    if folder not in ["equipments", "inspections", "subequipments", "spareparts", "workorders"]:
        raise HTTPException(status_code=404, detail="Dossier non trouvé")
    
    file_path = UPLOADS_DIR / folder / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Determine content type
    ext = get_file_extension(filename)
    content_types = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp"
    }
    content_type = content_types.get(ext, "application/octet-stream")
    
    return FileResponse(file_path, media_type=content_type)

# ==================== MAINTENANCE REPORT ====================

@api_router.get("/reports/maintenance")
async def get_maintenance_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate a maintenance report"""
    query = {}
    
    # Filter by date range if provided
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        query["date_intervention"] = date_filter
    
    # Get interventions
    interventions = await db.interventions.find(query, {"_id": 0}).to_list(10000)
    
    # Get work orders for reference
    work_orders = await db.work_orders.find({}, {"_id": 0}).to_list(10000)
    wo_dict = {wo["id"]: wo for wo in work_orders}
    
    # Get equipments for reference
    equipments = await db.equipments.find({}, {"_id": 0}).to_list(10000)
    eq_dict = {eq["id"]: eq for eq in equipments}
    
    # Build report
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period": {
            "start": start_date or "Début",
            "end": end_date or "Aujourd'hui"
        },
        "summary": {
            "total_interventions": len(interventions),
            "total_duration_minutes": sum(i.get("duree_minutes", 0) or 0 for i in interventions),
            "preventive_count": 0,
            "corrective_count": 0
        },
        "interventions": []
    }
    
    for intervention in interventions:
        wo = wo_dict.get(intervention.get("work_order_id"), {})
        eq = eq_dict.get(wo.get("equipment_id"), {})
        
        if wo.get("type_maintenance") == "preventive":
            report["summary"]["preventive_count"] += 1
        else:
            report["summary"]["corrective_count"] += 1
        
        report["interventions"].append({
            "date": intervention.get("date_intervention"),
            "technicien": intervention.get("technicien"),
            "ordre_travail": wo.get("titre", "N/A"),
            "type_maintenance": wo.get("type_maintenance", "N/A"),
            "equipement": f"{eq.get('type', 'Caisson')} - {eq.get('reference', 'N/A')}",
            "actions": intervention.get("actions_realisees"),
            "duree_minutes": intervention.get("duree_minutes"),
            "observations": intervention.get("observations"),
            "pieces_utilisees": intervention.get("pieces_utilisees", [])
        })
    
    return report

@api_router.get("/reports/maintenance/csv")
async def export_maintenance_report_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export maintenance report as CSV"""
    # Check permission
    if not can_export(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et techniciens")
    
    report = await get_maintenance_report(start_date, end_date, current_user)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Header
    writer.writerow([
        "Date", "Technicien", "Ordre de travail", "Type maintenance",
        "Équipement", "Actions réalisées", "Durée (min)", "Observations"
    ])
    
    # Data
    for i in report["interventions"]:
        writer.writerow([
            i["date"],
            i["technicien"],
            i["ordre_travail"],
            i["type_maintenance"],
            i["equipement"],
            i["actions"],
            i["duree_minutes"] or "",
            i["observations"] or ""
        ])
    
    output.seek(0)
    filename = f"rapport_maintenance_{start_date or 'debut'}_{end_date or 'fin'}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/reports/statistics")
async def get_statistics_report(current_user: dict = Depends(get_current_user)):
    """Get comprehensive statistics report"""
    if not can_export(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et techniciens")
    
    today = datetime.now(timezone.utc).date()
    
    # Equipment stats
    equipments = await db.equipments.find({}, {"_id": 0}).to_list(1000)
    equipment_by_type = {}
    equipment_by_status = {"en_service": 0, "maintenance": 0, "hors_service": 0}
    equipment_by_criticite = {"critique": 0, "haute": 0, "normale": 0, "basse": 0}
    
    for eq in equipments:
        eq_type = eq.get("type", "Autre")
        equipment_by_type[eq_type] = equipment_by_type.get(eq_type, 0) + 1
        equipment_by_status[eq.get("statut", "en_service")] = equipment_by_status.get(eq.get("statut", "en_service"), 0) + 1
        equipment_by_criticite[eq.get("criticite", "normale")] = equipment_by_criticite.get(eq.get("criticite", "normale"), 0) + 1
    
    # Work order stats
    work_orders = await db.work_orders.find({}, {"_id": 0}).to_list(1000)
    wo_by_status = {"planifiee": 0, "en_cours": 0, "terminee": 0, "annulee": 0}
    wo_by_type = {"preventive": 0, "corrective": 0}
    overdue_count = 0
    
    for wo in work_orders:
        wo_by_status[wo.get("statut", "planifiee")] = wo_by_status.get(wo.get("statut", "planifiee"), 0) + 1
        wo_by_type[wo.get("type_maintenance", "corrective")] = wo_by_type.get(wo.get("type_maintenance", "corrective"), 0) + 1
        try:
            planned_date = datetime.strptime(wo["date_planifiee"], "%Y-%m-%d").date()
            if planned_date < today and wo.get("statut") in ["planifiee", "en_cours"]:
                overdue_count += 1
        except:
            pass
    
    # Interventions stats
    interventions = await db.interventions.find({}, {"_id": 0}).to_list(1000)
    total_duration = sum(i.get("duree_minutes", 0) or 0 for i in interventions)
    
    # Inspections stats
    inspections = await db.inspections.find({}, {"_id": 0}).to_list(1000)
    expired_inspections = 0
    upcoming_inspections = 0
    
    for insp in inspections:
        try:
            validity_date = datetime.strptime(insp.get("date_validite", ""), "%Y-%m-%d").date()
            if validity_date < today:
                expired_inspections += 1
            elif (validity_date - today).days <= 30:
                upcoming_inspections += 1
        except:
            pass
    
    # Spare parts stats
    spare_parts = await db.spare_parts.find({}, {"_id": 0}).to_list(1000)
    low_stock_count = sum(1 for p in spare_parts if p.get("quantite_stock", 0) <= p.get("seuil_minimum", 1))
    total_stock_value = sum((p.get("quantite_stock", 0) * (p.get("prix_unitaire", 0) or 0)) for p in spare_parts)
    
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "equipments": {
            "total": len(equipments),
            "by_type": equipment_by_type,
            "by_status": equipment_by_status,
            "by_criticite": equipment_by_criticite
        },
        "work_orders": {
            "total": len(work_orders),
            "by_status": wo_by_status,
            "by_type": wo_by_type,
            "overdue": overdue_count
        },
        "interventions": {
            "total": len(interventions),
            "total_duration_minutes": total_duration,
            "average_duration_minutes": round(total_duration / len(interventions), 1) if interventions else 0
        },
        "inspections": {
            "total": len(inspections),
            "expired": expired_inspections,
            "upcoming_30_days": upcoming_inspections
        },
        "spare_parts": {
            "total": len(spare_parts),
            "low_stock": low_stock_count,
            "total_stock_value": round(total_stock_value, 2)
        }
    }

@api_router.get("/reports/statistics/csv")
async def export_statistics_csv(current_user: dict = Depends(get_current_user)):
    """Export statistics as CSV"""
    if not can_export(current_user):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et techniciens")
    
    stats = await get_statistics_report(current_user)
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Write statistics
    writer.writerow(["Rapport de statistiques HyperMaint"])
    writer.writerow(["Généré le", stats["generated_at"]])
    writer.writerow([])
    
    writer.writerow(["=== ÉQUIPEMENTS ==="])
    writer.writerow(["Total", stats["equipments"]["total"]])
    writer.writerow(["Par statut"])
    for k, v in stats["equipments"]["by_status"].items():
        writer.writerow(["", k, v])
    writer.writerow(["Par type"])
    for k, v in stats["equipments"]["by_type"].items():
        writer.writerow(["", k, v])
    writer.writerow([])
    
    writer.writerow(["=== ORDRES DE TRAVAIL ==="])
    writer.writerow(["Total", stats["work_orders"]["total"]])
    writer.writerow(["En retard", stats["work_orders"]["overdue"]])
    writer.writerow(["Par statut"])
    for k, v in stats["work_orders"]["by_status"].items():
        writer.writerow(["", k, v])
    writer.writerow([])
    
    writer.writerow(["=== INTERVENTIONS ==="])
    writer.writerow(["Total", stats["interventions"]["total"]])
    writer.writerow(["Durée totale (min)", stats["interventions"]["total_duration_minutes"]])
    writer.writerow(["Durée moyenne (min)", stats["interventions"]["average_duration_minutes"]])
    writer.writerow([])
    
    writer.writerow(["=== CONTRÔLES RÉGLEMENTAIRES ==="])
    writer.writerow(["Total", stats["inspections"]["total"]])
    writer.writerow(["Expirés", stats["inspections"]["expired"]])
    writer.writerow(["À renouveler (30j)", stats["inspections"]["upcoming_30_days"]])
    writer.writerow([])
    
    writer.writerow(["=== PIÈCES DÉTACHÉES ==="])
    writer.writerow(["Total", stats["spare_parts"]["total"]])
    writer.writerow(["Stock bas", stats["spare_parts"]["low_stock"]])
    writer.writerow(["Valeur totale stock (€)", stats["spare_parts"]["total_stock_value"]])
    
    output.seek(0)
    filename = f"statistiques_hypermaint_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
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
