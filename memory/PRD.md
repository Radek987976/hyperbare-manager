# HyperbareManager - PRD (Product Requirements Document)

## Changelog (2026-06-20k) — Masquer les équipements réformés (contrôle réglementaire + planning)
- ControlReports.jsx (/pv-controle) + Inspections.jsx (/controles): sélecteur « Équipement concerné » exclut `statut === 'reforme'`. Planning.jsx: filtre « Tous les équipements » exclut les réformés. Maintenance préventive (WorkOrders.jsx) filtrait déjà les réformés.
- Vérifié navigateur: recherche « COMANEX » (réformé) → « Aucun résultat » dans le formulaire de contrôle réglementaire.

## Changelog (2026-06-20j) — Intervention: masquer les équipements réformés
- Interventions.jsx: la liste déroulante « Équipement » du formulaire exclut les équipements `statut === 'reforme'`. Vérifié navigateur (recherche « COMANEX » réformé → aucun résultat).

## Changelog (2026-06-20i) — Corrections d'affichage mobile (modales + listes déroulantes)
- **Modales** (`components/ui/dialog.jsx`): ajout de `max-h-[90dvh] overflow-y-auto overscroll-contain` au `DialogContent` de base → sur smartphone le contenu ne dépasse plus en haut de l'écran (champ auparavant caché après rotation paysage→portrait) et défile en interne. Corrige toutes les modales de l'app (plusieurs n'avaient pas de hauteur max).
- **Listes déroulantes** (`components/ui/searchable-select.jsx`): `Popover` passé en `modal` → la liste (portail hors modale) défile désormais correctement sur mobile (le scroll-lock de la modale la bloquait auparavant). Sélection d'option toujours fonctionnelle.
- Vérifié sur viewport smartphone 390×844: modale scrollable (haut accessible), dropdown scrollable (scrollTop 0→400), sélection OK.

## Changelog (2026-06-20h) — Propagation dynamique des sous-équipements via "_GENERAL"
- **Règle**: un sous-équipement rattaché à un équipement `PREFIX_GENERAL` est automatiquement associé à tous les équipements du même préfixe (texte avant le 1er "_"). Ex: CHA_GENERAL → CHA_CHRONIQUE, CHA_SAS, CHA_URGENCE. Dynamique (aucune duplication de liens ; suit les équipements ajoutés plus tard).
- **Backend** `GET /subequipments?parent_equipment_id=X`: calcule les `match_ids` = X + id(s) des `PREFIX_GENERAL` de même préfixe, puis filtre. Utilisé par le détail équipement, etc.
- **Frontend** helper partagé `subEquipmentMatchesEquipment` (lib/utils.js) utilisé dans Interventions.jsx (sous-équipements proposés) et SubEquipments.jsx (filtre par équipement). Helpers `equipmentPrefix`, `subEquipmentParentIds`.
- Vérifié curl (CHA_CHRONIQUE & CHA_SAS voient le sous-équipement de CHA_GENERAL ; pas de fuite vers PUP_*) + navigateur (dropdown intervention propose le sous-équipement general). Aucune donnée modifiée.

## Changelog (2026-06-20g) — Intervention: sélection de plusieurs sous-équipements
- **Modèle**: `InterventionBase.sous_equipement_ids: List[str]` (multi) + `sous_equipement_id` conservé (principal, = 1er, rétro-compat).
- **Frontend** Interventions.jsx: champ « Sous-équipement(s) » en multi-sélection (chips ajout/suppression, `interv-sub-chips`, `interv-remove-sub-{id}`, `interv-subequipment-select`), filtré par l'équipement choisi (parents multiples pris en compte). Libellé liste + détail affichent tous les sous-équipements (getSubEquipmentNames). Payload envoie ids + principal.
- Vérifié curl (2 sous-équipements persistés + principal) + navigateur (chips, 0 erreur).

## Changelog (2026-06-20f) — Import sous-équipements multi-parents
- `import_subequipments_from_rows`: colonne PARENT_EQUIPEMENT accepte plusieurs équipements séparés par « ; » ou « , » → `parent_equipment_ids` + `parent_equipment_id` (1er). Parents introuvables ignorés avec avertissement (import continue si ≥1 parent valide). Anti-doublon par référence + intersection des parents. Modèle Excel mis à jour (exemple multi-parents). Description Import.jsx mise à jour.
- Vérifié curl: « ZZEQ-A; ZZEQ-B » → 2 parents ; parent inconnu ignoré (warning) ; import OK.

## Changelog (2026-06-20e) — Sous-équipements multi-parents (manomètre rattaché à plusieurs équipements)
- **Modèle**: `SubEquipmentBase.parent_equipment_ids: List[str]` (multi) + `parent_equipment_id` conservé comme parent principal (rétro-compat, = 1er de la liste). Helper `_normalize_parent_ids`.
- **Endpoints**: create/update valident chaque parent, stockent la liste + principal. `GET /subequipments?parent_equipment_id=X` matche `parent_equipment_id == X OU X ∈ parent_equipment_ids`. Rétro-compat en lecture (anciens docs → [parent_equipment_id]).
- **Suppression d'équipement** (choix user « pas de suppression ») : retire l'équipement des parents du sous-équipement mais ne supprime JAMAIS le sous-équipement (même s'il n'a plus aucun parent → parent_equipment_id=None). Réaffecte le parent principal.
- **Frontend** SubEquipments.jsx: sélecteur parent → multi-sélection (chips ajout/suppression, `parent-equipment-chips`, `remove-parent-{id}`, `input-parent-equipment`). Affichage liste/détail = tous les parents. Filtres adaptés. Interventions.jsx: sous-équipements proposés si l'équipement choisi est l'un de leurs parents.
- Import sous-équipements: peuple aussi `parent_equipment_ids`. Index Mongo ajouté.
- Vérifié curl (multi-parent OK, filtre par E1/E2 OK, suppression E1 puis E2 → sous-équipement conservé, détaché) + navigateur (chips, 0 erreur). Données existantes inchangées.

## Changelog (2026-06-20d) — Corrélation interventions ↔ maintenances préventives (outil admin)
- **Endpoint** `POST /api/admin/correlate-interventions?apply=false|true&threshold=0.9` (admin): relie les interventions non liées (`maintenance_preventive_id` null) à la maintenance préventive du MÊME équipement dont le titre correspond au texte de l'action (préfixe/exact prioritaire via `_match_score`, sinon similarité difflib ≥ seuil). apply=false = aperçu (dry-run, aucune modif) ; apply=true = applique via `bulk_write` (rapide). Passe les interventions rattachées en type « préventive ».
- **UI** Import.jsx : carte « Corréler interventions ↔ maintenances préventives » → bouton « Aperçu de la corrélation » (correlate-preview-btn) → dialog avec compteurs + exemples (Action → Maintenance) → bouton « Appliquer (N) » (correlate-apply-btn). `importAPI.correlateInterventions(apply)`.
- **Vérifié preview**: dry-run 4861 sans lien → 4380 rattachées (seuil 0.9, quasi tous préfixe/exact), 481 sans correspondance. Apply ~10s, idempotent (re-run: 0 nouveau match, 481 restants). Seuil relevé à 0.9 (seulement 11 correspondances floues écartées → zéro faux positif).
- Cible: production → après redéploiement, Import → Aperçu → Appliquer. Les 481 non rattachées (pas de maintenance préventive correspondante) restent à lier manuellement si souhaité.

## Changelog (2026-06-20c) — Import Excel des prestataires/fournisseurs (modèle + fichier réel)
- **Modèle téléchargeable** : `TEMPLATES["prestataires"]` (feuille Prestataires) → colonnes NOM, TYPE, SPECIALITES, CONTACT_NOM, EMAIL, TELEPHONE, ADRESSE, SIRET, NOTES. Bouton « Télécharger le modèle (.xlsx) » activé pour le type « prestataires » dans Import.jsx.
- **Import réel** : nouvelle `import_contractors_from_rows()` (remplace le seed codé en dur dans le dispatch `/api/import/excel`). SPECIALITES = types d'équipements séparés par « ; » ou « , », normalisés sur les types connus. TYPE validé (prestataire/fournisseur/organisme_controle). Anti-doublon par NOM (update sinon insert).
- Vérifié curl: modèle 200, import 2 créés (spécialités parsées), ré-import → 2 mis à jour (idempotent). Frontend: bouton visible pour Prestataires.

## Changelog (2026-06-20b) — Fix: prestataire vide dans Maintenance préventive (WorkOrders)
- **Bug**: le formulaire Maintenance préventive (`WorkOrders.jsx`) affichait « Aucun résultat » pour la « Prestation externe (sous-traitant) » — `loadData` ne chargeait jamais `contractorsAPI.getAll()` (régression iter 28), la liste `contractors` restait vide.
- **Fix**: chargement des prestataires ajouté dans `loadData` + filtrage STRICT par spécialité (`matchingContractors`) identique aux interventions : seuls les prestataires dont `specialites` contient le type de l'équipement sélectionné sont proposés (emptyText sinon).
- Vérifié navigateur (preview): Extincteur hyperbare CX01980016 → « Incendie Moz » proposé.

## Changelog (2026-06-20) — Prestataires par spécialité + Technicien par rôle + prestataire d'intervention (VÉRIFIÉ testing_agent iter 29, frontend 100%)
- **Spécialités prestataire (1a)**: `ContractorBase.specialites: List[str]` = types d'équipements pris en charge (multi-sélection). `specialite` (texte libre) conservé pour compat. Contractors.jsx: grille de badges cliquables des types d'équipements (`contractor-specialites`, `specialite-toggle-{type}`), colonne tableau affiche les spécialités en badges. Édition pré-coche les spécialités existantes.
- **Prestataire dans l'intervention (2b)**: `InterventionBase.prestataire_id: Optional[str]`. Interventions.jsx: champ « Prestataire externe » (`interv-prestataire-select`) filtré STRICTEMENT par les prestataires dont `specialites` contient le type de l'équipement sélectionné (si aucun → liste vide). Affiché dans le détail de l'intervention.
- **Technicien par rôle (3)**: Interventions.jsx charge tous les utilisateurs si admin (`usersAPI.getAll`), sinon uniquement l'utilisateur courant ; saisie libre toujours possible (`allowCustom`).
- **Export Excel prévisionnel (4)**: déjà existant (`export-forecast-btn`, `/api/budget/forecast/{annee}/export`) — vérifié HTTP 200 xlsx. Le choix user est Excel (pas PDF).
- Vérifié: curl backend (specialites + prestataire_id persistés, export xlsx 200) + testing_agent frontend 100%, 0 erreur console.
- Redéploiement requis pour la production.

# HyperbareManager - PRD (Product Requirements Document)

## Énoncé du problème original
Application web de GMAO (gestion de maintenance assistée par ordinateur) pour un caisson hyperbare unique contenant plusieurs équipements et sous-équipements.

## Changelog (2026-06-17j) — Dashboard admin : panneau « Demandes à traiter »
- `GET /api/dashboard/admin-requests` (admin) : inscriptions à valider (users is_approved=false), demandes de réinit. mot de passe (password_reset_requests pending), irrégularités (contrôles non_conforme/avec_reserves, équipements hors_service, résumé stock bas en 1 ligne).
- Dashboard : panneau admin-only « Demandes à traiter » (badge total). Boutons inline « Valider » (approve user) et « Envoyer MDP » (send-temp-password) ; irrégularités cliquables → page liée. `dashboardAPI.getAdminRequests`.
- Validé testing_agent iteration_20 (100% backend 9/9 + frontend 6/6). Note mineure hors-scope : PUT /users/{id}/password ne reset pas must_change_password (comportement existant, non lié).


- Nouveau composant `components/NavTabs.jsx` : barre d'onglets en haut du contenu. Chaque page visitée via le menu latéral s'ouvre comme onglet ; basculer/fermer (×) ; fermeture de l'onglet actif → bascule sur voisin. Menu latéral conservé, pas de persistance au reload, masqué sur mobile. Intégré dans `Layout.jsx`. Validé testing_agent iteration_19 (100%).


- Bug corrigé : `SparePartUpdate` n'incluait pas `equipment_type` (ni `nom`/`reference_fabricant`) → ces champs étaient ignorés à la mise à jour. Ajoutés au modèle ; PUT /api/spare-parts/{id} les persiste désormais. Validé testing_agent (iteration_18, 100% backend+frontend).
- SearchableSelect : filtrage remplacé par recherche par sous-chaîne (insensible casse/accents) sur label+référence → recherche de pièces par référence fiable (fix du fuzzy cmdk).


- Formulaire « Nouvelle intervention » : Équipement puis Sous-équipement (optionnel, filtré par parent) pour les DEUX types. Préventif : menu « Maintenance préventive concernée » filtré par l'équipement sélectionné (n'affiche que ses maintenances). Validation : equipment_id requis pour les deux types.
- Recherche pièces détachées par NOM et RÉFÉRENCE fabricant (référence incluse dans le libellé : « Nom — Réf (stock: X) »). Menu pièces filtré par type d'équipement.
- Import stock pièces détachées : `import_spare_parts_from_rows` (anti-doublon par réf fabricant), dispatch `pieces`, `TEMPLATES["pieces"]`, bouton modèle téléchargeable dans page Import.
- Index MongoDB créés au démarrage (interventions/work_orders/inspections/equipments/subequipments/formations/gas_cylinders) + pagination (25/page) sur la liste interventions → perf.
- Testé : testing_agent frontend 100% (iteration_17), flux préventif API HTTP 200, import pièces + anti-doublon.


- Nouveau `POST /api/equipment-types/cleanup` : supprime les types non utilisés par aucun équipement (match sur `equipment.type` vs `nom`/`code`, insensible à la casse) + les doublons (même nom). Retourne `{deleted, noms}`.
- Frontend `EquipmentTypes.jsx` : bouton « Nettoyer les types inutilisés » (admin, confirmation) ; liste triée par nom A→Z (`localeCompare` fr). `equipmentTypesAPI.cleanup`.
- Testé (preview) : 7 orphelins supprimés (Porte, Joint, Soupape, Capteur, Système de sécurité, Manomètre, Appareil respiratoire isolant), 8 types utilisés conservés et triés.


- `GET /api/admin/reset-history-status` : renvoie `{done}` (flag `app_meta.history_reset` OU détection paresseuse si les 4 collections d'historique sont vides → pose le flag). `reset-history` pose le flag après exécution et renvoie 409 si déjà fait.
- Frontend Import : le bouton « Réinitialiser l'historique » est masqué (remplacé par « ✓ Déjà effectuée ») quand `done:true`. Vérifié preview (done:true, ré-appel 409).
- ⚠️ Observation : historique preview vide = identique à la prod → preview et prod semblent partager la même base MongoDB (à confirmer avec support).


- `POST /api/admin/reset-history?confirm=RESET` (admin) : supprime `interventions`, `work_orders`, `inspections`, `formations` et vide `historique_statut`/`historique_compteur` des équipements. Conserve équipements, sous-équipements, bouteilles, prestataires, utilisateurs. Garde-fou : `confirm=RESET` obligatoire (sinon 400).
- UI : bouton rouge « Réinitialiser l'historique » dans page Import (carte Maintenance des données) + AlertDialog avec saisie « RESET » obligatoire. `importAPI.resetHistory`.
- Testé : garde-fou vérifié (400 sans confirmation), frontend compile. NON exécuté sur preview pour préserver les données. À lancer une seule fois en prod après sauvegarde.


- Nouveau type de gaz **« air_respirable »** ajouté (backend `GAS_TYPES` + normalisation import « respirable »).
- Code couleur des badges/pastilles dans la page Bouteilles : Air Médical = fond noir/texte blanc ; Oxygène (O2) = fond blanc/texte noir (bordure) ; Héliox = fond marron (#795548)/texte blanc ; Nitrox = fond gris/texte blanc ; Air Respirable = fond hachuré noir & blanc (repeating-linear-gradient)/texte blanc.
- Grille des stats passée à 5 colonnes ; l'icône de chaque carte reprend la couleur/style du type. Testé : backend accepte le nouveau type (création OK), frontend compile.


- **Nettoyage** : `POST /api/admin/cleanup-fake-corrective` (admin) supprime les faux ordres correctifs pollués (« Formation CAH », « Y_Dépannage », « Y_Mise en service »). Bouton « Nettoyer » ajouté dans page Import (carte « Maintenance des données »). Exécuté sur preview : 4 « Formation CAH » supprimés.
- **Badge type** : liste des interventions affiche une pastille colorée « Curative » (ambre) / « Préventive » (turquoise) dans la colonne Objet.
- **Suppression intervention** : `DELETE /api/interventions/{id}` (admin) supprime l'intervention et re-crédite le stock des pièces. Bouton « Supprimer » (avec confirmation) ajouté dans la modale de détail (testid `interv-delete-btn`). `interventionsAPI.delete` + `cleanupFakeCorrective`.
- Description de l'import « Interventions » enrichie (DESIGNATION/MOTIF, rattachement sous-équipement).


- **Interventions curatives découplées des ordres de travail** : une intervention curative se saisit désormais en choisissant directement **Équipement** (obligatoire) + **Sous-équipement** (optionnel, filtré par équipement) + **Motif/désignation** texte libre. Plus besoin de créer un ordre correctif au préalable ; `work_order_id` n'est plus utilisé pour le curatif. Le préventif reste inchangé (rattaché à une maintenance planifiée).
- **Backend** : `InterventionBase` a 2 champs optionnels `titre` et `sous_equipement_id`. `_build_maintenance_history` agrège les interventions via `$or {equipment_id, sous_equipement_id}` → une intervention sur un sous-équipement apparaît dans l'historique du sous-équipement ET de l'équipement parent. Vérifié via API.
- **Import interventions amélioré** (pour données « Y_Dépannage ») : accepte `DESIGNATION`/`DÉSIGNATION`/`MOTIF`/`TITRE` comme motif (fallback actions), rattache automatiquement au sous-équipement (et à son parent) si la référence/nom correspond à un sous-équipement.
- **Dashboard nettoyé** : suppression des graphiques « État des équipements » et « Ordres de travail », et de la 2e section compteurs horaires « Compteurs horaires des compresseurs ». Conservés : bandeau compteur horaire en haut, 4 cartes stats, alertes, maintenances à venir, calendrier hebdo.
- Formations = purement indicatives (créées par l'admin, affichées dans les calendriers/planning), ne sont ni interventions ni maintenances. À noter : d'anciens ordres correctifs pollués (« formation CAH », « Y_Dépannage ») peuvent subsister en base — nettoyage à confirmer par l'utilisateur.


- **Export par collection en Excel** : `GET /api/export/xlsx/{collection}` remplace `/export/csv/{collection}`. Les 5 boutons (Équipements, Ordres de travail, Interventions, Contrôles, Pièces détachées) téléchargent désormais des fichiers `.xlsx` (openpyxl via pandas), plus de CSV. SQL et JSON conservés tels quels. Front: `exportAPI.collectionXlsx`, `handleExportCollection`, testids `export-xlsx-*`.
- **Anti-duplication imports** : `import_maintenance_from_rows` et `import_controls_from_rows` font maintenant un upsert par (equipment_id + titre) — mise à jour au lieu d'insérer un doublon si le même fichier est ré-importé. Réponse enrichie de `updated`.
- Testé backend (curl, 5 exports = xlsx valides via openpyxl).


## Changelog (2026-06-16) — Contrôles : renouvellement + historique + dropdowns
- **Renouvellement de contrôle** : `POST /api/inspections/{id}/renew` archive la réalisation courante dans `historique_controles` (traçabilité) puis met à jour date_realisation et recalcule date_validite → le contrôle repasse « Valide ». `PUT /inspections/{id}` ne touche plus à l'historique (pop + recalcul date_validite).
- **UI Inspections** : bouton « Renouveler » (rapide dans la liste quand expiré/≤30j, menu ⋯, et détail), modal de renouvellement (date éditable + résultat/organisme/observations), section « Historique des contrôles » dans le détail. `inspectionsAPI.renew`.
- **Nouveau contrôle** : Titre et Type de contrôle passés en listes déroulantes searchable + saisie libre ; date de réalisation éditable (non figée). PDF après enregistrement déjà présent.
- Testé 100% backend+frontend (iteration_16), tests pytest ajoutés (test_inspection_renew.py).


## Changelog (2026-06-16) — Imports Excel (sous-équipements, maintenance préventive, contrôles) + modèles
- Nouveaux imports rows-based (testés E2E) : `import_subequipments_from_rows` (soupapes/manomètres/déverseurs → subequipments, rattachés par PARENT_EQUIPEMENT), `import_maintenance_from_rows` (maintenances préventives → work_orders preventive), `import_controls_from_rows` (contrôles réglementaires → inspections, date_validite auto-calculée via PERIODICITES). Dispatcher `/api/import/excel` mis à jour.
- Modèles `/api/import/template/{type}` ajoutés pour : sous-equipements, maintenance, controles (equipements & interventions existaient). Bouton « Télécharger le modèle » activé pour les 5 types dans Import.jsx ; nouveau type « Sous-équipements » dans la liste.
- Fichiers Excel générés dans `frontend/public/templates/` : modele_equipements/sous-equipements/interventions/maintenance/controles.xlsx + modele_import_GMAO_complet.xlsx (5 feuilles).
- ⚠️ Ces imports ne fonctionneront en PRODUCTION qu'après redéploiement (nouveau code backend). Ordre d'import : équipements → sous-équipements → maintenance/contrôles/interventions.


## Changelog (2026-06-16) — Dashboard : clic → intervention
- Sur le Tableau de bord, cliquer une **alerte active** (type ordre de travail), une **maintenance à venir** ou un item de l'**agenda hebdomadaire** ouvre désormais le **formulaire d'intervention pré-rempli** (page Interventions) avec la maintenance correspondante : préventive → OT préventif (`maintenance_preventive_id`), corrective → OT correctif (`work_order_id`).
- Les **contrôles réglementaires** continuent de renvoyer vers la page Contrôles ; les alertes stock/gaz/équipement gardent leur navigation dédiée ; une formation ne déclenche rien.
- Implémentation : `Dashboard.jsx` (goToAlert/goToUpcoming + onClick agenda) → `navigate('/interventions', { state: { openWorkOrderId } })` ; `Interventions.jsx` effet sur `_loc.state.openWorkOrderId` ouvre le modal pré-rempli (même pattern que WorkOrders openId).
- Ajout `DialogDescription` au modal d'intervention (correctif a11y). Testé UI 100% (iteration_15).


## Changelog (2026-06-16) — Cache stale fix + Mot de passe oublié
- **Fix « je ne vois pas les mises à jour »**: le service worker (`public/service-worker.js`) était en **cache-first** et resservait indéfiniment l'ancienne version. Passé en **network-first** (cache v2) + rechargement auto via `controllerchange` dans `index.js`. Les utilisateurs récupèrent désormais la dernière version automatiquement.
- **Mot de passe oublié (flux admin-médié)**:
  - Login : lien « Mot de passe oublié ? » → modal email → `POST /api/auth/forgot-password` (réponse générique, anti-énumération) → notifie **tous les admins** par email.
  - Admin (page Utilisateurs) : carte « demandes de réinitialisation » (`GET /api/users/reset-requests`) + bouton « Envoyer un mot de passe temporaire » (`POST /api/users/{id}/send-temp-password`) → génère un mot de passe temporaire (secrets), l'affiche à l'admin (repli si email non délivré) et le mail à l'utilisateur.
  - Changement forcé : `must_change_password` renvoyé au login ; `ProtectedRoute` affiche `ForcePasswordChange` jusqu'au changement (`PUT /api/users/me/change-password` efface le flag).
  - Techniciens excluent l'admin (déjà fait). Testé E2E API 100% + UI 100% (iteration_14).
- Email Resend : en mode sandbox (`onboarding@resend.dev`) l'envoi réel peut échouer ; le mot de passe temporaire est toujours affiché à l'admin. Pour l'envoi à tous, vérifier un domaine dans Resend.
- Utilisateur de test créé : tech@hypermaint.fr / tech12345 (technicien).


## Changelog (2026-06-16) — Lot fonctionnalités (interventions, formations, réforme, dashboard)
- **Dashboard cliquable**: les alertes (`goToAlert`) et maintenances à venir (`goToUpcoming`) ouvrent directement l'OT concerné (WorkOrders ouvre le détail via `location.state.openId`).
- **Calendrier hebdomadaire**: la grille 52 semaines du Dashboard remplacée par un agenda groupé semaine par semaine (`data-testid=weekly-agenda`), items cliquables.
- **Interventions**: édition d'une ancienne intervention réservée à l'admin (`PUT /api/interventions/{id}`, réajuste le stock des pièces), ajout/suppression de PV PDF même après enregistrement (`POST/DELETE /api/interventions/{id}/documents`), affichage des pièces utilisées dans le détail.
- **Formations**: nouvelle entité (`/api/formations` CRUD, admin). Création depuis le Dashboard (nom, technicien, du→au). Visible dans l'agenda hebdo, le calendrier Planning (bande violette, icône GraduationCap) et le calendrier dashboard. Un technicien ne voit que ses formations ; l'admin voit tout.
- **Réforme**: ajout du champ « Technicien responsable » (`technicien_reforme`) en plus du motif ; consigné dans l'historique des statuts et affiché dans la fiche.
- **Techniciens**: `GET /api/users/technicians` exclut désormais les comptes admin (saisie libre toujours possible).
- Testé par l'agent de test (iteration_13) : 100% backend + frontend. Bug corrigé : import `useNavigate` + `formationsAPI/usersAPI` dans Dashboard.jsx.


## Changelog (2026-06-16) — Préparation déploiement + revue de code (sécurité)
- **Déploiement**: 2 blocages corrigés → `JWT_SECRET` généré aléatoirement dans `backend/.env` (plus de fallback codé en dur, `server.py` L70 = `os.environ['JWT_SECRET']`) ; `.gitignore` nettoyé (fichiers `.env` requis ne sont plus bloqués, lignes `-e` parasites retirées). deployment_agent → PASS. Login vérifié OK.
- **Correctifs sécurité/qualité (faible risque)**:
  - XSS impression PV: échappement HTML (`esc()`) de toutes les valeurs saisies dans `ControlReports.jsx` (fenêtre d'impression `document.write`).
  - Identifiants de test sortis en variables d'env (`TEST_ADMIN_EMAIL`/`TEST_ADMIN_PASSWORD` avec fallback) dans les 4 fichiers `backend/tests/`.
  - Clés React `index` → identifiants stables (`url`/`doc.url`) sur les listes photos/documents supprimables (Equipments, WorkOrders, SubEquipments, SpareParts, Inspections) + prestations Contracts + légende Dashboard.
- **Faux positifs revue** (non modifiés): `is`/`==` (tous des `is None`, corrects) ; `import_real_data.py:113` (`token="Réf"` = mot-clé colonne, pas un secret) ; `key={index}` restants sur listes statiques.
- **Non retenus** (risqués/sans valeur utilisateur, refusés): migration tokens localStorage→cookies httpOnly, découpage gros composants, dépendances de hooks, suppression des `console.error`.


## Changelog (2026-06-16) — Import historiques Apple Numbers
- Import de 5 fichiers `.numbers` via `numbers-parser` (script `backend/import_numbers_history.py`, source="hist_numbers").
- **2844 interventions historiques** importées et rattachées : BAUER 01 (506), Chambres Chronique/Urgence/SAS (~1185), Pupitre (388), ARI C1/C2 (419), Cuves (63), Extincteurs→Caisson (276), LUCHARD (7).
- **Compteurs horaires** (fichier compresseur, dernier relevé) : **BAUER 01 = 7002 h** (246 relevés), **LUCHARD = 780 h** (4 relevés). BAUER 02 volontairement exclu (non demandé).
- Fix backend : détection compresseur insensible à la casse ; limites de requête interventions relevées (10000 liste / 5000 par équipement).
- Nettoyage cosmétique : préfixes de tri "Y_/Z_/X_" retirés (16 interventions, 34 OT).
- Total interventions en base ≈ 2961.


## Changelog (2026-06-15) — Migration historique
- **Interventions historiques** : les 114 maintenances préventives à date passée ont été converties en interventions "terminées" (script `backend/migrate_history.py`), et les OT marqués `terminee`. Historique des interventions = 117 au total, visibles dans la page Interventions ET dans la fiche équipement/sous-équipement (endpoint `/equipments/{id}/history`).
- **Sous-équipements** : 76 créés (52 manomètres + 24 soupapes) dans la collection `subequipments`, rattachés par emplacement (Chronique/SAS/Urgence, sinon Caisson général). Réformés → statut hors_service.
- **Compteur horaire** : BAUER 01 = 7441 h (dernière lecture fiable du fichier Excel). ⚠️ BAUER 02 et LUCHARD non extractibles du fichier (données trop bruitées) — en attente de valeurs.
- **Fix backend** : détection compresseur insensible à la casse (`Compresseur`) pour la mise à jour du compteur lors d'une intervention.


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

### 2026-07-19 — Stockage persistant des fichiers + fix PDF "page blanche"
- **Problème 1**: fichiers (PDF fiches techniques, procédures, photos, PV) stockés sur disque local éphémère → perdus à chaque redéploiement ("ne s'ouvre pas" / 404).
- **Fix 1 (backend `server.py`)**: migration vers **Emergent Object Storage** (persistant). Helpers `init_storage/save_upload/read_upload`, `APP_NAME="hypermaint"`, clé `EMERGENT_LLM_KEY` ajoutée à backend/.env. Tous les endpoints d'upload écrivent maintenant en storage; `GET /api/uploads/{folder}/{filename}` lit depuis storage (+ fallback disque legacy) avec support **HTTP Range 206** (requis par le viewer PDF Chrome). Vérifié via curl (upload→open 200, range 206).
- **Problème 2**: PDF ouvrait une page blanche. Cause: l'ingress force `Cache-Control: no-store` sur toutes les routes /api → casse le lecteur PDF Chrome (impossible à surcharger côté serveur).
- **Fix 2 (frontend `lib/api.js` + 6 pages)**: helper `openStoredFile(url)` qui récupère le fichier en **blob** et l'ouvre via une URL locale `blob:` (contourne les en-têtes de l'ingress). Appliqué à SpareParts, Interventions, Inspections, WorkOrders, SubEquipments, Equipments, Documents (liens PDF → onClick openStoredFile).
- **IMPORTANT**: les fichiers ajoutés AVANT ce fix sont perdus (disque effacé) → à ré-uploader.
- **EN ATTENTE validation utilisateur** (rendu PDF vérifiable uniquement dans un vrai navigateur; headless sans lecteur PDF).
- **Backlog proposé (non tranché par user)**: (a) traçabilité "ajouté par technicien + date", (b) export ZIP audit de tous les documents, (c) indicateur de stockage admin.
- **Bug UI en attente**: modal "Nouvelle intervention" (Interventions.jsx L462) — débordement horizontal + boutons Enregistrer/Annuler cachés (à restructurer header fixe / corps scroll / footer fixe).

### 2026-07-19 (suite) — Lecteur PDF intégré + fix modal Intervention (VÉRIFIÉ testing_agent 100%, iter 24)
- **Lecteur PDF intégré**: composant `components/PdfViewer.jsx` (`openPdf` + `PdfViewerHost`). `PdfViewerHost` monté une fois dans Layout.jsx, écoute l'événement window `emergent:open-pdf`, récupère le fichier en blob et l'affiche dans un `<iframe>` (modal). Boutons "Onglet" + "Télécharger". `openStoredFile` (lib/api.js) dispatch désormais l'événement. Fallback image pour non-PDF. Testids: pdf-viewer-modal, pdf-viewer-frame, pdf-viewer-newtab, pdf-viewer-download, pdf-viewer-filename.
- **Fix modal "Nouvelle intervention"** (Interventions.jsx): DialogContent `p-0 gap-0 !flex flex-col overflow-hidden`, header fixe (border-b), corps `flex-1 overflow-y-auto overflow-x-hidden`, footer fixe (border-t). Boutons Annuler/Enregistrer toujours visibles, plus de débordement horizontal.
- Vérifié: modal footer bottom=838<900, scrollWidth=clientWidth (pas d'overflow), corps scrollable; PDF viewer iframe src blob, réseau 200 application/pdf, 0 erreur console.

### 2026-07-19 (suite) — Maintenances "en retard" sur équipements réformés (corrigé + nettoyé)
- **Cause racine**: l'endpoint `POST /work-orders/{id}/complete` (server.py ~L2830) régénérait la maintenance préventive suivante SANS vérifier si l'équipement est réformé → des ordres `planifiee` réapparaissaient et comptaient comme "en retard" (ex: COMP_LUCHAR).
- **Fix code**: ajout d'un contrôle `is_reformed_next` dans `complete_work_order` — plus de régénération si l'équipement est réformé (cohérent avec la logique existante de réforme L1353 et le blocage de création L1569).
- **Nettoyage données**: annulé (statut `annulee`) tous les ordres préventifs actifs (planifiee/en_cours) des 4 équipements réformés = 15 ordres. Vérifié: LUCHAR 3/3 annulés, alertes maintenance_retard=0.
- Base partagée preview/production → nettoyage appliqué aux deux. Le code doit être redéployé pour propager le fix de régénération en production.

### 2026-07-19 (suite) — Action "Réformer en 1 clic" (VÉRIFIÉ testing_agent 100%, iter 25)
- **Equipments.jsx**: nouvel item de menu "Réformer" (dropdown actions, visible si canModify() && statut != 'reforme', data-testid reform-{id}) ouvrant un modal `reform-modal` (date_reforme pré-remplie, motif SearchableSelect, technicien SearchableSelect). Confirmation → `equipmentsAPI.update(id, {...champs, statut:'reforme', date/motif/technicien})`. Le backend (PUT /equipments L1353) solde automatiquement les maintenances préventives actives (annulee). Vérifié via API (payload→200→WO annulée) et UI (row grisée, menu masqué après réforme).
- Note: route liste = /equipements (orthographe FR).

### 2026-07-19 (suite) — Seuil de stock à 0 = pas d'alerte (+ tolérance import)
- **Seuil 0 = non surveillé**: toutes les comparaisons de stock bas (7 emplacements dans server.py: get_spare_parts?low_stock, stats, alerts admin, dashboard alert-summary, export CSV, email alertes) exigent désormais `seuil_minimum > 0 AND quantite_stock <= seuil_minimum`. Frontend `SpareParts.jsx` isLowStock idem; parseInt `|| 0`; champ min=0 + hint "Mettez 0 pour ne pas être alerté". Import default seuil = 0. Vérifié via API (seuil0→aucune alerte, seuil2/stock1→alerte).
- **Import tolérant** (server.py `_cell`): matching insensible casse/accents/espaces/underscores + alias typo "REFERENCE_FARBICANT". Corrige le bug prod "nom = référence" dû à l'en-tête mal orthographié. Vérifié via import Excel réel.
- **complete_work_order**: ne régénère plus de maintenance si équipement réformé (fix récurrence).
- EN ATTENTE: redéploiement production pour activer ces correctifs backend en live. Nettoyage stock (vidage+réimport) proposé mais non exécuté (en attente réponse user sur impact interventions/photos).

### 2026-07-19 (suite) — Boutons d'ajustement de quantité agrandis
- **SpareParts.jsx** modal "Ajuster le stock": boutons -1/+1 agrandis (h-14, text-xl, icônes w-6, bordure 2px, survol rouge/vert), champ quantité h-12 text-lg centré.
- **index.css** (global): flèches natives des `input[type=number]` (::-webkit-inner/outer-spin-button) toujours visibles + agrandies (width 1.75rem, height 2.5rem) → s'applique à tous les champs de quantité de l'app.
- Front compile OK. À valider visuellement par l'utilisateur (screenshot tool ne gère pas les flux authentifiés). Redéploiement requis pour la production.

### 2026-07-19 (suite) — Devise XPF/EUR + Budget prévisionnel N+1 (VÉRIFIÉ testing_agent 100%, iter 26)
**Phase 1 — Devise pièces détachées**
- server.py: SparePartBase/Update ont `devise` (XPF défaut/EUR). Constante EUR_TO_XPF=119.3, helper prix_unitaire_xpf(). Totaux valeur stock convertis en XPF (reports/statistics + dashboard summary). Import détecte colonne DEVISE, template inclut DEVISE. Label CSV "(XPF)".
- SpareParts.jsx: sélecteur devise (select-devise) au formulaire, estimation "≈ X XPF (1€=119,3 XPF)" si EUR, colonne "Prix" (cell-prix) + détail (detail-prix) via formatPrice(). Vérifié: 50€ → 5 965,0 XPF.

**Phase 2 — Budget prévisionnel N+1** (option C)
- server.py: WorkOrderBase a `pieces_prevues` [{spare_part_id, quantite}]. Endpoint GET /api/budget/forecast/{annee}: pour chaque maintenance préventive (équipement non réformé), occurrences/an = 365/periodicite_jours OU moyenne heures (historique compteur)/periodicite_heures; pièces = pieces_prevues sinon fallback dernière intervention; coût = occ × Σ(qte × prix_unitaire_xpf). Dédoublonnage par (equipment,titre). Total XPF+EUR. Vérifié: 30j→12/an, 1 pièce→12u→12000 XPF.
- WorkOrders.jsx: section "Pièces prévues par intervention" (select-piece-prevue, input-piece-qte, add-piece-prevue-btn, pieces-prevues-list). Charge spareParts.
- Budget.jsx: carte "Prévisionnel automatique" (forecast-card) + bouton Recalculer (generate-forecast-btn) → total (forecast-total) + tableau dépliable par maintenance (forecast-row). budgetAPI.getForecast ajouté.
- NOTE: total=0 tant que l'utilisateur n'a pas renseigné les pièces prévues sur les maintenances. Sous-traitance NON incluse (contrats gérés à part, choix user).
- Mineur non bloquant: overlay dev CRA "ResizeObserver loop" visible en preview (disparaît en build prod).
- Redéploiement requis pour la production.

### 2026-07-19 (suite) — Export prévisionnel Excel + pré-remplissage historique (VÉRIFIÉ testing_agent 100%, iter 27)
- **Export Excel prévisionnel**: server.py GET /api/budget/forecast/{annee}/export → xlsx 2 feuilles (Synthese + Detail_Pieces). Refactor: _compute_forecast(annee) partagé. Budget.jsx: bouton "Export Excel" (export-forecast-btn) visible après Calculer, télécharge via blob. budgetAPI.exportForecast ajouté.
- **Pré-remplir depuis l'historique**: server.py GET /api/work-orders/{id}/suggested-pieces → pièces de la dernière intervention liée (par work_order_id, sinon même équipement+titre). WorkOrders.jsx: bouton "Pré-remplir depuis l'historique" (prefill-history-btn) visible en édition d'une maintenance préventive → remplit pieces_prevues. workOrdersAPI.getSuggestedPieces ajouté.
- Vérifié via curl (export xlsx OK; suggested-pieces renvoie qte 2) + testing_agent frontend 100%.
- Redéploiement requis pour la production.

### 2026-07-19 (suite) — Coût prestataire par maintenance préventive (VÉRIFIÉ testing_agent 100%, iter 28)
- **Objectif**: ajouter le prix d'une prestation externe (sous-traitant) PAR maintenance préventive (coût par passage). Un prestataire peut intervenir sur plusieurs maintenances; le prix dépend de la maintenance.
- **server.py**: WorkOrderBase + `cout_prestataire`, `prestataire_id` (contractor), `devise_prestataire` (XPF/EUR). _compute_forecast: par ligne `cout_prestataire_unitaire_xpf`, `cout_prestation_annuel_xpf` = coût × occurrences/an; totaux séparés `total_prestations_xpf/eur` (NON additionnés aux pièces, choix user "2B"). Export Excel: 3e feuille "Prestations" + colonnes prestataire dans Synthese.
- **WorkOrders.jsx**: bloc "Prestation externe (sous-traitant)" dans le formulaire préventif (select-prestataire, input-cout-prestataire, select-devise-prestataire + estimation XPF). Charge contractorsAPI.
- **Budget.jsx**: 2 totaux distincts (forecast-total pièces + forecast-total-prestations), colonne "Prestation/an" (forecast-prestation-cell) avec nom prestataire.
- Vérifié curl: extincteur Entretien annuel 10000×1 + Entretien 6 mois 2000×2 = total prestations 14000 XPF. Frontend 100%.
- Fix au passage: doublon de fin de fichier WorkOrders.jsx supprimé.
- Redéploiement requis pour la production.
