# HyperbareManager - PRD (Product Requirements Document)

## Énoncé du problème original
Application web de GMAO (gestion de maintenance assistée par ordinateur) pour un caisson hyperbare unique contenant plusieurs équipements et sous-équipements.

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
