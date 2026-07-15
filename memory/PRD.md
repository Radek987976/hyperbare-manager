# HyperbareManager - PRD (Product Requirements Document)

## Énoncé du problème original
Application web de GMAO (gestion de maintenance assistée par ordinateur) pour un caisson hyperbare unique contenant plusieurs équipements et sous-équipements.

## Changelog (2026-06-15)
- **Bouton "Nouvelle intervention"** ajouté sur le tableau de bord à côté de "Nouvelle maintenance" (route /interventions).
- **Listes déroulantes searchables** : nouveau composant réutilisable `frontend/src/components/ui/searchable-select.jsx` (Popover + cmdk). Tri alphabétique, recherche en tapant, dernier élément sélectionné remonté en haut (mémorisé via localStorage par data-testid). Migration de TOUS les `<Select>` de l'app (16 pages).
- **Fix compteur horaire compresseur** : la détection `isCompressor` dans Interventions est désormais insensible à la casse (le type en base est 'Compresseur'). Le champ "Compteur horaire compresseur" s'affiche bien lors de la création d'une intervention sur un compresseur.
- Fonctionnalité "bloc-notes/messagerie sur tableau de bord" : ABANDONNÉE à la demande de l'utilisateur.
- Testé frontend (iteration_11.json) : 100% OK, aucun blocage.


## Architecture technique

### Backend (FastAPI + MongoDB)
- **Framework**: FastAPI
- **Base de données**: MongoDB (via Motor async driver)
- **Authentification**: JWT avec bcrypt
- **Collections**: users, caisson, equipments, work_orders, interventions, inspections, spare_parts

### Frontend (React + Tailwind + Shadcn/UI)
- **Framework**: React 19
- **Styling**: Tailwind CSS + Shadcn/UI components
- **Charts**: Recharts
- **Routing**: React Router v7
- **State**: React Context (AuthContext)

## Personas utilisateurs
1. **Administrateur**: Gestion complète + utilisateurs + exports
2. **Technicien**: Consultation + création d'interventions

## Fonctionnalités implémentées ✅

### Phase 1 - Core (Implémenté 04/02/2026)
- [x] Authentification JWT (inscription/connexion)
- [x] Gestion du caisson hyperbare (CRUD)
- [x] Gestion des équipements (portes, joints, soupapes, compresseurs, capteurs, systèmes de sécurité)
- [x] Ordres de travail (préventif/correctif)
- [x] Interventions avec pièces utilisées
- [x] Contrôles réglementaires avec alertes d'expiration
- [x] Stock de pièces détachées avec alertes stock bas
- [x] Tableau de bord avec statistiques et graphiques
- [x] Export données (CSV, SQL, JSON)
- [x] Gestion des utilisateurs (admin only)
- [x] Interface responsive en français

### Phase 2 - Extensions (Implémenté session précédente)
- [x] CRUD types d'équipements
- [x] CRUD sous-équipements
- [x] Upload fichiers (photos/PDF) pour équipements, sous-équipements, pièces, maintenances
- [x] Workflow maintenance curative vs préventive
- [x] Compteur horaire pour équipements (compresseurs)
- [x] Périodicité horaire pour maintenances
- [x] Calendrier 52 semaines sur le dashboard
- [x] Affichage compteur horaire compresseurs sur dashboard

### Phase 3 - Admin (Implémenté 12/02/2026)
- [x] Création d'utilisateurs par l'administrateur (bouton + modal)
- [x] Upload photos/PDF sur la page Équipements

### Phase 4 - Notifications Email (Implémenté 12/02/2026)
- [x] Configuration Resend API
- [x] Email de bienvenue (nouvel utilisateur)
- [x] Email d'approbation/refus d'accès
- [x] Email rappel maintenance (30 jours avant)
- [x] Email maintenance en retard
- [x] Email stock bas
- [x] Email compteur horaire atteint
- [x] Bouton "Envoyer alertes" sur le dashboard (admin)

### Phase 5 - PWA & Renommage (Implémenté 12/02/2026)
- [x] Renommage application "HyperMaint GMAO" → "HyperbareManager"
- [x] Manifest PWA (manifest.json)
- [x] Service Worker pour cache et offline
- [x] Icônes PWA (192x192, 512x512)
- [x] Prompt d'installation PWA
- [x] Support Apple mobile web app

### Phase 6 - Rapports PDF (Implémenté 12/02/2026)
- [x] Rapport de statistiques (vue d'ensemble)
- [x] Rapport de maintenance (historique filtrable par période)
- [x] Fiche équipement (détails + historique maintenance/interventions)
- [x] Rapport des interventions (filtrable par période)
- [x] Planning de maintenance (52 semaines)
- [x] Page "Rapports PDF" avec interface de téléchargement

### Phase 7 - Sécurité Utilisateur (Implémenté 12/02/2026)
- [x] Changement de mot de passe self-service (via modal dans la sidebar)
- [x] Endpoint sécurisé `/api/users/me/change-password` avec vérification du mot de passe actuel
- [x] Validation: minimum 6 caractères, confirmation requise
- [x] Messages d'erreur clairs en français

## Backlog P0/P1/P2

### P0 (Critique)
- ✅ Toutes les fonctionnalités core implémentées
- ✅ Changement de mot de passe self-service

### P1 (Important)
- ✅ Notifications par email pour alertes critiques (Resend)
- ✅ Génération de rapports PDF
- ✅ Calendrier de maintenance visuel (52 semaines)
- [ ] Historique complet avec recherche avancée

### P2 (Nice to have)
- [ ] Mode multi-caissons (évolution future)
- [ ] Mode multi-sites
- ✅ Application mobile (PWA)
- [ ] Intégration API capteurs IoT
- [ ] Tableau de bord personnalisable

## Structure de la base de données

```
users: {id, email, nom, prenom, role, password_hash, is_active, created_at}
caisson: {id, identifiant, modele, fabricant, date_mise_en_service, pression_maximale, normes_applicables, description}
equipments: {id, type, reference, numero_serie, criticite, statut, caisson_id, description, date_installation}
work_orders: {id, titre, description, type_maintenance, priorite, statut, caisson_id, equipment_id, date_planifiee, periodicite_jours, technicien_assigne}
interventions: {id, work_order_id, date_intervention, technicien, actions_realisees, observations, pieces_utilisees, duree_minutes}
inspections: {id, titre, type_controle, caisson_id, equipment_id, date_realisation, date_validite, organisme_certificateur, resultat, observations}
spare_parts: {id, nom, reference_fabricant, equipment_type, quantite_stock, seuil_minimum, emplacement, fournisseur, prix_unitaire}
```

## Endpoints API

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Users
- GET /api/users
- POST /api/users/create
- PUT /api/users/{id}/role
- PUT /api/users/{id}/approve
- PUT /api/users/{id}/reject
- PUT /api/users/{id}/suspend
- PUT /api/users/{id}/activate
- DELETE /api/users/{id}
- PUT /api/users/me/change-password (self-service password change)
- PUT /api/users/{id}/password (admin only)

### Resources
- GET/POST/PUT /api/caisson
- GET/POST/PUT/DELETE /api/equipments
- GET/POST/PUT/DELETE /api/work-orders
- GET/POST /api/interventions
- GET/POST/PUT/DELETE /api/inspections
- GET/POST/PUT/DELETE /api/spare-parts

### Dashboard
- GET /api/dashboard/stats
- GET /api/dashboard/alerts
- GET /api/dashboard/upcoming-maintenance

### Export
- GET /api/export/csv/{collection}
- GET /api/export/sql
- GET /api/export/json

## Prochaines actions suggérées
1. Ajouter des équipements supplémentaires (portes, joints, soupapes, capteurs)
2. Planifier des maintenances préventives périodiques
3. Configurer les contrôles réglementaires avec dates de validité
4. Former les techniciens à l'utilisation de l'application

---

## Journal des modifications

### 2026-07-14 — Import des données réelles client (P0 — TERMINÉ)
- **Script**: `/app/backend/import_real_data.py` (idempotent, champ `source` par lot)
- **Sources** (artefacts client): `maintenance.xlsx`, `suivi_controle.xlsx`, `budget.xlsx` (téléchargés dans `/tmp/imports`)
- **Données importées** dans `hyperbaremanager_prod`:
  - 1 Caisson (CH-01, CMC Mahieu, 5 bars)
  - 8 équipements (3 compresseurs BAUER 01/02 + LUCHARD, 3 cuves incendie, 2 ARI)
  - 357 contrôles/inspections (248 depuis feuilles maintenance + 109 depuis suivi contrôle)
  - 98 lignes budget 2026 (total 5 792 438 XPF ≈ 48 540 €)
  - 132 bouteilles de gaz (41 O2, 73 Air médical, 7 Héliox, 11 Nitrox)
  - 133 pièces détachées (INVENTAIRE)
  - Nettoyage préalable des données de test (TEST-*, "Test ...")
- **Corrections associées**:
  - `dashboard/alerts` renvoyait 500 (date_validite None → strptime TypeError). Corrigé + garde None.
  - `dashboard/upcoming-maintenance` & `dashboard/calendar` enrichis pour inclure les inspections (via `date_validite`).
  - Comparaisons `type == "compresseur"` rendues insensibles à la casse (backend server.py + frontend Equipments.jsx) → compteurs horaires compresseurs visibles.
  - Budget.jsx: année par défaut = année courante (2026) au lieu de +1.
- **Vérifié**: dashboard (8 équip., 178 alertes, 77/133 stock bas, 3 compresseurs), pages Bouteilles, Contrôles réglementaires, Budget 2026 affichent bien les données.

### 2026-07-14 (suite) — Recherche globale sur le Tableau de bord (VÉRIFIÉ testing_agent 100%)
- **Backend**: `GET /api/search?q=` sur équipements, sous-équipements, ordres de travail, interventions, contrôles → `{results, count}`.
- **Frontend**: composant `GlobalSearch.jsx` (debounce, dropdown groupé, navigation clavier) dans le header Dashboard. Navigation directe: clic équipement/sous-équipement → ouvre la fiche détail (`state.openId`); maintenance/intervention/contrôle → page filtrée (`state.q`).

### 2026-07-14 (suite) — Équipements Pupitre & Réseau gaz + reliaison
- `link_pupitre_gaz.py`: crée « Pupitre de commande » (type Pupitre) et « Réseau gaz » (type Réseau gaz), relie leurs maintenances par mots-clés (pupitre/tableau → Pupitre 14 ; réseau/gaz/vanne/détendeur → Réseau gaz 8). Total équipements = 13. 50 ordres restent non rattachés (extincteurs/ARI génériques/contrôles niveau caisson).

### 2026-07-14 (suite) — Extincteurs/ARI + Filtre Planning + Fiche PDF (VÉRIFIÉ testing_agent 100%, backend 9/9)
- **Reliaison 100%**: `link_remaining.py` crée « Extincteurs hyperbares », « ARI (parc) », « Caisson (général) ». 0 maintenance non reliée. Total = 16 équipements.
- **Filtre Planning**: `/api/planning/events` & `/api/planning/summary` acceptent `equipment_id`; Select `planning-equipment-filter` sur la page Planning.
- **Fiche PDF équipement**: bouton « Fiche PDF » (`download-equipment-pdf-btn`) dans le modal → `/api/reports/pdf/equipment/{id}` (infos + historique). PDF sur fiche équipement (documents) déjà existant, confirmé fonctionnel.

### 2026-07-14 (suite) — État équipement « Réformé » (VÉRIFIÉ testing_agent 100%)
- Nouvel état `reforme` : équipement conservé dans l'historique mais exclu des maintenances futures et en retard.
- Backend: helper `_reformed_equipment_ids()`; exclusion dans `get_alerts`, `get_upcoming_maintenance`, `get_maintenance_calendar`, `get_planning_events`, `get_planning_summary`, `_build_maintenance_history` (futures=[] si réformé, historique conservé).
- Frontend: `reforme` dans STATUTS (Equipments.jsx) + `statusLabels.reforme` (« Réformé ») + `getStatusClass` (badge gris).

### 2026-07-14 (suite) — Date/motif de réforme + Extincteurs individuels (VÉRIFIÉ testing_agent 100%, backend 7/7)
- **Date + motif de réforme**: champs `date_reforme` + `motif_reforme` sur Equipment. Formulaire édition: apparaissent si statut='reforme' (date + Select motif). Affichés dans la fiche. Nullifiés si statut != reforme.
- **Extincteurs individuels**: `link_extincteurs.py` remplace le parc par 4 extincteurs (CX0198-0016, CX0219-0018/0024/0082), 12 contrôles réels répartis, work_orders réassignés, parc supprimé. Total = 19 équipements.

## Backlog / Tâches à venir
- **P1** ~~PDF attaché à chaque contrôle réglementaire~~ ✅ FAIT (2026-07-14)
- **P1** ~~Équipements chambres (Chronique/SAS/Urgence) + reliaison maintenances~~ ✅ FAIT (2026-07-14)
- **P2** Notifications email/push pour les alertes — NON souhaité par l'utilisateur.
- Recherche avancée (filtres) — NON souhaité par l'utilisateur.

### 2026-07-14 (suite) — PDF sur contrôles + Chambres (VÉRIFIÉ testing_agent 100%, backend 12/12)
- **PDF sur contrôle**: UI câblée dans `Inspections.jsx` (modal détail → section « Documents PDF (PV / procédures) », ajout/suppression). Endpoints `POST/DELETE /api/inspections/{id}/procedures` (PDF only, servis via /api/uploads/inspections/).
- **Chambres**: `link_chambers.py` crée 3 équipements (Chambre Chronique/SAS/Urgence, type « Chambre hyperbare ») et relie 114 ordres de travail (40/36/38). History: Chronique 39, SAS 35, Urgence 38 futures. Total équipements = 11.

### 2026-07-14 (suite) — Historique & maintenances futures par équipement (VÉRIFIÉ testing_agent 100%)
- **Backend**: helper `_build_maintenance_history()` + `GET /equipments/{id}/history` et `GET /subequipments/{id}/history` → `{historique, futures}` (agrège interventions, work_orders, inspections par equipment_id).
- **Frontend**: composant `MaintenanceHistory.jsx` intégré dans les fiches détail de `Equipments.jsx` et `SubEquipments.jsx` (sections « Maintenances à venir » + « Historique », items colorés, en retard en rouge). `getHistory` ajouté dans api.js.
- Note: seuls compresseurs (BAUER) et cuves ont des maintenances liées (equipment_id) dans les données importées.

### 2026-07-14 (suite) — Planning mensuel automatique (VÉRIFIÉ testing_agent 100%)
- **Backend** (`server.py`): `POST /work-orders/{id}/complete` (clôture + génère la prochaine occurrence à J+periodicite_jours + crée intervention + maj compteur compresseur), `POST /planning/reschedule` (glisser-déposer), `GET /planning/events?start&end` (fusion work_orders+inspections, champ `origine`, `is_overdue`), `GET /planning/summary?year` (compteurs par mois).
- **Frontend**: page `Planning.jsx` (route `/planning`, menu « Planning ») — vue Mois (grille custom, événements colorés, drag&drop) + vue Année (12 cartes mois), légende couleur, dialog détail + « Marquer réalisé & planifier la suite ». `planningAPI` + `workOrdersAPI.complete` dans api.js.
- Couleurs: préventif=teal, réglementaire=indigo, correctif=ambre, en retard=rouge, réalisé=vert.
