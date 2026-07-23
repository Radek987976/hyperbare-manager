# HyperbareManager - PRD (Product Requirements Document)

## Changelog (2026-07-23b) — Correctif erreur preview + retrait bouton + dédoublonnage + ZIP audit
- **Erreur bloquante « ResizeObserver loop … » (preview)** : neutralisée dans `index.js` (handler window.error + filtrage console.error). L'overlay de dev ne bloque plus le formulaire d'intervention. Vérifié écran (plus d'overlay).
- **Bouton « Tout copier » retiré** du panneau « Dernière intervention » (les flèches → par champ restent). `copyAllFromLast` supprimé.
- **Outil admin « Fusionner les maintenances préventives en double »** (Import) : `POST /admin/dedupe-preventive-workorders?apply=false|true`. Regroupe par (équipement, titre), garde le représentant (le plus d'interventions), **ré-attache** les interventions des doublons puis supprime les doublons (aucune intervention supprimée). Aperçu (groupes, fiches à fusionner, interventions ré-attachées, exemples) → Appliquer. Vérifié curl (0 doublon en preview ; utile en production). UI mirroir des autres outils.
- **Export ZIP audit annuel** (Reports) : `GET /reports/zip/audit/{year}` → archive contenant plan de maintenance, 12 check-listes, 12 PV mensuels, PV annuel, registre des contrôles. Bouton « Tout télécharger en ZIP » (utilise l'année du sélecteur). Vérifié curl : **27 fichiers**, 418 Ko.
- ⚠️ À exécuter/redéployer en **production** : les correctifs et outils sont dans le code preview → **redéploiement requis**. Le dédoublonnage est particulièrement destiné à la base production (qui contient les doublons).

## Changelog (2026-07-23) — Panneau « Dernière intervention » (copie) + 2 correctifs PDF
- **Panneau de copie dans le formulaire d'intervention (`Interventions.jsx`)** : quand une maintenance préventive OU un contrôle est sélectionné, un panneau à **gauche** affiche la **dernière intervention** liée (date, technicien, durée, prestataire, actions, relevés/grille, observations). Bouton **« Tout copier »** + une flèche → par champ pour recopier vers la nouvelle intervention (la date n'est pas copiée par « Tout copier » pour garder aujourd'hui). Modale élargie (max-w-5xl), panneau masqué sur mobile. `lastIntervention` mémoïsé (aucune latence de frappe). Vérifié écran : panneau affiché, « Tout copier » remplit technicien + actions.
- **Correctif PDF « Rapport des interventions » = 0** : le filtre de période comparait `date_realisation` (champ inexistant) → 0 résultat. Corrigé pour utiliser `date_intervention`, + titre de maintenance/contrôle résolu (titre libre / maintenance préventive / inspection) et technicien (texte). Vérifié curl : 01/01→31/12/2026 = **668** interventions (avant : 0).
- **Correctif check-liste : maintenance affichée en double (une OK + une « Jamais réalisée »)** : cause = plusieurs `work_orders` pour la même maintenance (occurrences régénérées / ré-imports) — un avec intervention, l'autre sans. `_build_plan_items` **dédoublonne désormais par (équipement, titre)** et agrège la dernière réalisation sur tout le groupe → une seule ligne correcte. Corrige partout (plan, check-liste, PV mensuel, PV annuel). Vérifié : check-liste 2026/08 → Servomex 1×/pupitre, plus de « Jamais réalisée » fantôme.
- ⚠️ Les 2 bugs PDF étaient constatés en **production** ; les correctifs sont dans le code preview → **redéploiement requis** pour la production.

## Changelog (2026-07-22c) — Migration ponctuelle : Actions réalisées ← Observations
- **`POST /admin/backfill-actions-from-observations?apply=false|true`** (admin) : pour chaque intervention dont « Actions réalisées » n'apporte pas d'info réelle (vide, OU = au motif/titre curatif, OU = au titre de la maintenance préventive liée) **ET** dont « Observations » n'est pas vide → remplace les actions par les observations. Sinon aucune modification. `apply=false` = aperçu (dry-run, aucune écriture — vérifié), `apply=true` = applique (bulk_write). Retour : total, matched, exemples avant/après.
- **UI (`Import.jsx`, admin)** : carte « Corriger Actions réalisées à partir des Observations » → bouton Aperçu → dialog (compteur + exemples) → « Appliquer ». `importAPI.backfillActionsFromObservations`.
- **Exécution** : appliqué sur la base **PREVIEW** pendant les tests (3452 interventions mises à jour ; les anciennes actions n'étaient que des doublons de titre → aucune perte d'info réelle). Pour la **PRODUCTION** : après redéploiement, Import → Aperçu → Appliquer (une seule fois).

## Changelog (2026-07-22b) — Libellé onglet Contrôles + gestion des types de contrôle
- **Onglet « / » corrigé** : `NavTabs.ROUTE_LABELS` ne contenait pas `/controles` → l'onglet affichait `/controles`. Ajouté `'/controles': 'Contrôles réglementaires'`. Vérifié écran : onglet propre.
- **Types de contrôle gérables** (comme les types de gaz) : collection `control_types`. `GET /control-types`, `POST /control-types {label}` (anti-doublon insensible casse, refuse les défauts), `DELETE /control-types/{id}` (admin). Vérifié curl : création, doublon→400, suppression.
- **UI (`Inspections.jsx`)** : bouton **« Gérer les types »** à côté du champ « Type de contrôle » → dialog (ajout + liste des types personnalisés avec suppression). Le sélecteur « Type de contrôle » propose : défauts (Contrôle réglementaire / constructeur) + types personnalisés + types déjà utilisés. `inspectionsAPI.getControlTypes/createControlType/deleteControlType`. Vérifié écran.

## Changelog (2026-07-22) — Correctif transfert (historique) + Liaison intervention ↔ contrôle
**A) Correctif du transfert maintenance → contrôle (historique manquant sur données historiques)**
- `transfer_to_inspections` (server.py) : si aucune intervention n'est liée strictement (`maintenance_preventive_id`), **repli par correspondance texte** (seuil `_match_score` ≥ 0.9, même équipement) pour rattacher les interventions historiques importées sans lien. Ces interventions ne sont **pas détachées** (non destructif, `fallback_used`). Vérifié curl : maintenance test « étalonnage manomètre pupitre » + 2 interventions legacy → transfert → contrôle avec date_réalisation = plus récente + 1 réalisation archivée (avant : historique vide).

**B) Liaison intervention ↔ contrôle réglementaire (source unique de vérité, Option C)**
- `InterventionBase.inspection_id` (nouveau) : une intervention peut être rattachée à un contrôle réglementaire.
- Formulaire d'intervention (`Interventions.jsx`) : 3e type **« Contrôle réglementaire »** → sélecteur « Contrôle réglementaire concerné » filtré par équipement (`interv-inspection-select`). Badge indigo « Contrôle » dans la liste.
- `create_intervention` : si `inspection_id` fourni → `_sync_inspection_from_interventions()` met à jour le contrôle (date_réalisation = intervention la plus récente, recalcul de l'échéance). **On ne supprime aucune intervention.**
- `renew_inspection` : le renouvellement **crée automatiquement une intervention liée** (`type_intervention="controle"`, titre « Renouvellement — … ») en plus d'archiver l'ancienne réalisation.
- `GET /inspections/{id}/history` : renvoie `linked_interventions` + `historique_controles`. Détail du contrôle (`Inspections.jsx`) : nouvelle section « Interventions liées » (`controle-linked-interventions`).
- Vérifié curl E2E : lien → date_validite recalculée (quinquennal 2025-06-01 → 2030), renew → intervention créée + archivage, endpoint historique OK. Données de test nettoyées.
- Option B (copie+synchro maintenance↔contrôle avec conservation des deux) **écartée** (source de désynchronisation/doublons d'alertes).

## Changelog (2026-06-21u) — Filtres Excel + tri titre sur Contrôles réglementaires
- **Contrôles réglementaires (`Inspections.jsx`)** : filtres « Excel » par colonne ajoutés (Titre, Équipement, Type, Périodicité, Prochaine échéance, Statut, Organisme) via `useColumnFilters`/`ColumnFilter`/`applyTableFilters`/`distinctValues`, comme les autres tableaux. **Tri par Titre alphabétique par défaut**. Bouton « Effacer tous les filtres » + persistance en session (`controles:cols` / `controles:search`). Colonne « Statut » filtrable (Valide / À échéance / Expiré / À planifier). Vérifié écran : 7 entonnoirs présents, tri titre par défaut.

## Changelog (2026-06-21t) — Menu réordonné + reclassement inverse contrôle→maintenance
- **Menu latéral** : « Contrôles réglementaires » déplacé juste sous « Maintenance préventive » (`Layout.jsx`).
- **Reclasser contrôle → maintenance préventive (admin, inverse du transfert)** :
  - `GET /admin/inspection-candidates?q=` : liste des contrôles reclassables (titre, équipement, périodicité, nb réalisations archivées).
  - `POST /admin/transfer-to-maintenances {inspection_ids:[...]}` : pour chaque contrôle → crée une maintenance préventive (`type_maintenance=preventive`, statut `planifiee`, `periodicite_jours` via `PERIODICITES`, `date_planifiee` = date_validite, équipement/caisson repris) puis **supprime le contrôle**. L'ancien historique d'interventions n'est pas re-rattaché (limitation assumée). Vérifié curl : 1 reclassement → WO annuel 365j créé, contrôle supprimé.
  - UI (`Import.jsx`, admin) : carte « Reclasser des contrôles réglementaires en Maintenance préventive » + dialog de sélection multiple + confirmation (miroir du transfert). `importAPI.inspectionCandidates()/transferToMaintenances()`. Vérifié écran.

## Changelog (2026-06-21s) — Colonne équipement (contrôles) + latence de frappe (interventions)
- **Contrôles réglementaires** : ajout d'une colonne **« Équipement »** dans la liste (`Inspections.jsx`), et correction du libellé affichant « undefined - REF » dans l'aperçu → `getEquipmentLabel` retombe sur `equipment.type` si absent du dictionnaire, et « Caisson entier » si pas d'équipement. Vérifié écran.
- **Latence de frappe dans le formulaire d'intervention** : cause = ~4864 interventions re-parcourues 7× (filtre + 5 `distinctValues` + `applyTableFilters`) à **chaque touche** (le formulaire et le tableau partagent le même composant). Correctif : mémoïsation (`useMemo`) de `filtered`, `colFiltered`, `distinctMap` et `paged` → ces calculs ne se relancent plus quand `formData` change. Vérifié : saisie fonctionnelle, liste/filtres OK. (Autres pages non concernées : jeux de données bien plus petits.)

## Changelog (2026-06-21r) — Audit complet des dates (fuseau horaire Tahiti UTC-10)
- **Correctifs de décalage « jour d'avant/après »** dus au fuseau (Tahiti UTC-10), dans `lib/utils.js` + pages :
  - `formatDate` : dates `AAAA-MM-JJ` formatées sans conversion de fuseau (déjà fait 06-21).
  - Nouveaux helpers `parseDate` (parse date-only en Date **locale**) et `toYMD` (Date → `AAAA-MM-JJ` local, sans `toISOString`).
  - `daysUntil` : utilise `parseDate` → calculs de retards/échéances corrects (WorkOrders, Inspections, GasCylinders...).
  - `Dashboard` agenda hebdomadaire : regroupement par semaine (`mondayOf`, clé) et en-tête « Semaine du X au Y » via `toYMD` (avant : `toISOString().slice(0,10)` décalait d'un jour).
  - `Planning` `safeFormat`, `Documents`/`Contracts` `isExpired`/`isExpiringSoon`, coloration expiration `GasCylinders` : via `parseDate`.
  - **Dates « aujourd'hui » par défaut** des formulaires : `new Date().toISOString().split('T')[0]` (UTC → lendemain en soirée) remplacé par `toYMD(new Date())` (local) dans Interventions, GasCylinders, Inspections, Equipments, ControlReports.
  - `formatDateTime` (last_login) : inchangé — vrai timestamp, comportement correct.
  - **PDF backend** : vérifié — formatage `datetime.fromisoformat(...).strftime(...)` naïf/UTC, aucune conversion locale → dates correctes.
  - Vérifié : compilation OK ; Dashboard (agenda) et Planning s'affichent sans erreur, événements aux bons jours.

## Changelog (2026-06-21q) — Correctif import bouteilles + modèle d'import
- **Import bouteilles = 0 → corrigé** : le parseur `import_gas_cylinders_from_excel` ne reconnaissait pas les intitulés du fichier client (`TYPE_DE_GAZ`, `N°_BOUTEILLE`, `VOLUME`, `STATUT`…) → toutes les lignes ignorées. Réécrit :
  - Normalisation des en-têtes (accents/casse/ponctuation) + nombreux alias.
  - Détection de type robuste aux accents : « Oxygène »→O2, « Air Médicale »→air_medicale, « Héliox »→heliox ; **CO2 ≠ O2** (le token `o2` est vérifié en mot entier, plus en sous-chaîne de « co2 ») ; types inconnus (CO2, Azote, mélanges) créés comme **types personnalisés**.
  - Numéros lus en décimaux par pandas (`1497.0`) normalisés en entier (`1497`).
  - **Anti-doublon par N° de bouteille seul** (une bouteille = un numéro unique), champs mis à jour si déjà présent.
  - Champs importés : volume, pression, statut, localisation, dates (remplissage/expiration/épreuve/prochaine épreuve), observations, agent.
  - Vérifié sur le fichier client (133 lignes, 8 types) : 131 importées / 1 mise à jour / 0 erreur, 0 doublon.
- **Modèle d'import bouteilles** : ajout de l'entrée `bouteilles` dans `TEMPLATES` (colonnes exactes + exemple) et activation du bouton « Télécharger le modèle » sur la page Import.
- **Nettoyage données preview** : la collection `gas_cylinders` était massivement dupliquée (chaque bouteille en double `1497` et `1497.0`) — nettoyée et réimportée proprement (132 bouteilles uniques). NB : en **production**, après redéploiement, il faudra réimporter le fichier pour bénéficier du même nettoyage.

## Changelog (2026-06-21p) — Types de gaz personnalisés
- **Ajout de types de gaz (bouteilles)** :
  - Backend : nouvelle collection `gas_types`. `GET /gas-types` (liste des types personnalisés), `POST /gas-types {label}` (crée un type, `value` = slug du nom, anti-doublon vs types par défaut + existants, `require_technicien_or_admin`). Validation de `create_gas_cylinder` assouplie via `_allowed_gas_types()` = types par défaut + personnalisés. Vérifié curl : création « Trimix », bouteille avec type custom acceptée, doublon rejeté (400).
  - Frontend (`GasCylinders.jsx`) : bouton **« + Ajouter un type »** à côté du menu « Type de gaz » du formulaire → dialog de saisie du nom → type dispo immédiatement et pré-sélectionné. Les types personnalisés apparaissent dans le menu, les filtres colonne et les **statistiques par type** (couleur neutre par défaut). `gasCylindersAPI.getGasTypes()/createGasType()`. Vérifié écran : bouton + dialog OK, carte stat du nouveau type affichée.

## Changelog (2026-06-21o) — Registre PDF des contrôles + filtres persistants
- **Registre des contrôles réglementaires en PDF (audit)** :
  - `GET /reports/pdf/registre-controles` : PDF **paysage A4** avec en-tête officiel CHPF (`make_header_canvas` désormais paramétrable `page_w`/`page_h` pour supporter le paysage). Ligne de synthèse (Total / Valides / Expirés / À planifier), tableau (Titre, Type, Équipement, Périodicité, Dernière réalisation, Prochaine échéance, Statut, Organisme, Résultat), **lignes expirées en rouge**, pied de page signatures. Vérifié : HTTP 200 + rendu visuel OK.
  - UI : nouvelle carte « Registre des contrôles réglementaires » sur la page Rapports (`Reports.jsx`) avec Aperçu/Imprimer + Télécharger. `reportsAPI.registreControlesPDF()`.
- **Filtres persistants (même session)** :
  - Hook `useSessionState(key, default)` + `useColumnFilters(initialSort, storageKey)` persistent recherche, tris et filtres Excel dans `sessionStorage` (conservés tant que l'onglet reste ouvert).
  - Appliqué à Équipements, Sous-équipements, Interventions (+ plage de dates), Maintenance préventive, Stock pièces, Prestataires, Contrats, Bouteilles de gaz. Clés `<page>:search` / `<page>:cols`. Vérifié écran : recherche « ARI » conservée après aller-retour Tableau de bord → Équipements.

## Changelog (2026-06-21n) — Transfert maintenances → contrôles + registre d'export
- **Transfert vers Contrôles réglementaires (admin, page Import)** :
  - `GET /admin/transfer-candidates?q=` : liste les maintenances préventives transférables (titre, équipement, périodicité, nb interventions liées). Filtre texte.
  - `POST /admin/transfer-to-inspections {work_order_ids:[...]}` : pour chaque maintenance → crée un contrôle (`type_controle="Contrôle réglementaire"`), périodicité déduite via `_jours_to_periodicite`, date_réalisation = intervention la plus récente, **tout l'historique des interventions liées repris dans `historique_controles`**, puis interventions détachées (`maintenance_preventive_id=None`) et **maintenance d'origine supprimée**. Vérifié curl : 1 transfert → contrôle quinquennal, date 2022-02-04, 3 réalisations archivées, WO supprimé (404).
  - UI (`Import.jsx`, admin only) : carte « Transférer des maintenances vers les Contrôles réglementaires » → dialog de sélection (recherche, tout sélectionner, cases à cocher, compteur) + confirmation. Vérifié écran : 221 candidats, dialog opérationnel.
- **Export des contrôles réglementaires exploitable (registre audit)** :
  - `GET /export/xlsx/inspections` renvoie désormais un **registre lisible** (`_export_inspections_register`) : en-têtes FR (Titre, Type, Équipement=réf(type), Périodicité, Dernière réalisation, Prochaine échéance, Statut Valide/Expiré/À planifier, Organisme, Résultat, Nb réalisations, Observations), largeurs de colonnes, tri par échéance.
  - **Ne renvoie plus 404 quand vide** → fichier avec en-têtes seuls (registre exploitable pour audit même sans données). Vérifié curl : HTTP 200, en-têtes présents.

## Changelog (2026-06-21m) — Retard signalé + nettoyage des filtres hérités
- **Retard signalé (règle périodicité, choix user 1a)** : une maintenance préventive est « en retard » si le nombre de jours depuis sa **dernière réalisation** dépasse sa **périodicité en jours** (> hebdo), ou si elle n'a **jamais** été réalisée. Réformés/terminés/annulés exclus.
  - Backend `_build_plan_items` : chaque item porte `is_late` + `days_since`. Endpoint `GET /work-orders` enrichi (retrait du response_model strict) avec `is_late` + `derniere_realisation` par maintenance préventive. Vérifié curl : 60 maintenances en retard sur 222 préventives.
  - PDF **Check-liste** (`/reports/pdf/check-liste`) : lignes en retard en rouge (`#C0271A`), colonne « Dernière réalisation » en gras + « ⚠ Retard signalé » / « ⚠ Jamais réalisée ».
  - UI **Maintenance préventive** (WorkOrders.jsx) : ligne rouge (`bg-red-50/60`), titre rouge, icône AlertTriangle, badge rouge « Retard signalé » (data-testid `work-order-late-{id}`). Vérifié écran : 60 badges + surlignage.
- **Nettoyage filtres hérités (choix user d=oui)** : suppression des anciens sélecteurs de filtre (menus déroulants) sur Équipements, Sous-équipements, Interventions, Maintenance préventive, Stock pièces, Prestataires, Contrats, Bouteilles de gaz. Barre de recherche + filtres Excel par colonne conservés. Bouton **« Effacer tous les filtres »** (data-testid `clear-filters-btn`, visible si recherche/filtres actifs) → réinitialise recherche + filtres Excel (`clearAll`). Interventions conserve aussi le filtre par plage de dates.
  - Note : **Documents.jsx** laissé inchangé (pas de filtres Excel — la suppression de ses dropdowns aurait supprimé tout filtrage). À convertir si souhaité.

## Changelog (2026-06-21k) — Filtres Excel étendus aux 5 tableaux restants
- Filtres type Excel (`table-column-filter`) ajoutés à : **Sous-équipements** (défaut nom→réf conservé, sort initial null), **Prestataires** (défaut nom), **Contrats** (défaut n° contrat), **Bouteilles de gaz** (défaut n° bouteille), **Utilisateurs** (défaut nom). Colonne « Période » de Contrats laissée en libellé simple (plage de dates).
- Users : logique de filtre déplacée dans le sous-composant `UserTable` (converti en corps de fonction avec son propre `useColumnFilters`).
- Tri par défaut nom→référence appliqué sur tous les nouveaux tableaux filtrables.
- Vérifié UI : icônes entonnoir présentes sur les 5 pages ; filtre Utilisateurs Rôle=Administrateur → 1 ligne.

## Changelog (2026-06-21j) — Dernière connexion, profil (nom), filtres Excel étendus
- **Dernière connexion** : `last_login` (ISO) enregistré à chaque login (server.py). Colonne « Dernière connexion » dans la page Utilisateurs (admins) via `formatDateTime` ; « Jamais » si absent.
- **Profil self-service** : endpoint `PUT /users/me/profile` (nom, prénom). Layout : dialog renommé « Mon profil » avec champs Prénom/Nom + bouton « Enregistrer le nom » (au-dessus de la section mot de passe). `AuthContext.updateUserInfo` met à jour l'utilisateur + localStorage → barre latérale actualisée. `usersAPI.updateProfile`.
- **Filtres Excel** étendus (composant `table-column-filter`) à : Stock pièces (SpareParts, tri défaut nom), Maintenance préventive (WorkOrders), Interventions (avant pagination). Équipements déjà fait.
- Vérifié UI : profil sauvegardé + reflété en barre latérale + revert ; WorkOrders Statut=Planifiée → 185 lignes ; backend last_login + profil (curl).

## Changelog (2026-06-21i) — Filtres type Excel (démo Équipements)
- Nouveau composant réutilisable `components/ui/table-column-filter.jsx` : hook `useColumnFilters`, helpers `applyTableFilters`/`distinctValues`, composant `ColumnFilter` (entonnoir par colonne : Trier A→Z / Z→A, recherche, cases à cocher multi-sélection + « (Sélectionner tout) », OK/Annuler). Valeurs distinctes calculées selon les autres filtres (comportement Excel).
- Appliqué au tableau **Équipements** (colonnes Type, Référence, N° Série, Criticité, Statut, Compteur h, Installation). Suppression des 3 anciens sélecteurs de filtre (remplacés). Recherche globale conservée + bouton « Réinitialiser les filtres ».
- Vérifié UI : ouverture du menu, tri, et filtrage effectif (Statut = En service → 28 lignes, entonnoir actif).
- EN ATTENTE VALIDATION UTILISATEUR avant déploiement sur les autres tableaux + points 1-3 (dernière connexion, changement de nom, tri global).

## Changelog (2026-06-21h) — Fix débordements généralisé (SearchableSelect)
- Garde-fou global : `SearchableSelect` → `min-w-0` sur le bouton et sur le `<span>` du label (troncature fiable dans tout conteneur flex). Corrige les débordements partout.
- WorkOrders : bloc « Pièces prévues » passé en `flex-1 min-w-0` + `shrink-0` sur quantité/bouton (même correctif que le bloc pièces d'Interventions). Vérifié UI.
- Audit : aucun autre `<div className="flex-1">` n'enveloppe directement un SearchableSelect.

## Changelog (2026-06-21g) — Fix débordement « Pièces utilisées » (Interventions)
- Le bloc d'ajout de pièce débordait (bouton « Ajouter » coupé) car le `SearchableSelect` ne se tronquait pas. Ajout de `min-w-0` sur le conteneur flex + `shrink-0` sur quantité/bouton. Vérifié UI.

## Changelog (2026-06-21f) — Tri liste sous-équipements
- Liste des sous-équipements (SubEquipments.jsx) triée par **nom puis référence** (alphabétique, numeric-aware). Vérifié UI.

## Changelog (2026-06-21e) — Ordre des mois, marges étroites check-liste, centrage vertical
- **Mois chronologiques** : `SearchableSelect` reçoit une prop `sortOptions` (défaut true = tri alpha inchangé pour tous les autres menus). Le sélecteur de mois (Reports.jsx) passe `sortOptions={false}` → ordre Janvier→Décembre, et désactive aussi la remontée « dernier utilisé ».
- **Marges étroites check-liste** : endpoint check-liste en `leftMargin=rightMargin=1cm`, colonnes élargies. `make_header_canvas(intitule, margin)` + `_build_header_table(..., avail_w)` dessinent le cartouche sur toute la largeur utile (colonne centrale élastique).
- **Centrage vertical global** : `('VALIGN', (0,0), (-1,-1), 'MIDDLE')` ajouté à `create_table_style()` → tous les tableaux PDF (anciens et nouveaux) ont leur texte centré verticalement.
- Vérifié : rendu pdftoppm (check-liste avril, texte centré, pleine largeur) + screenshot UI (menu mois Jan→Déc).

## Changelog (2026-06-21d) — Check-liste : dernière réalisation + choix du mois
- **Choix du mois** : le sélecteur « Mois (check-liste & PV mensuel) » de la page Rapports PDF pilote à la fois la check-liste mensuelle et le PV de contrôle mensuel (déjà en place, confirmé UI : cartes affichant « Juillet 2026 »).
- **Dernière réalisation** : `_build_plan_items()` calcule pour chaque maintenance la date de l'intervention la plus récente liée (via `interventions.maintenance_preventive_id` → max `date_intervention`, format DD/MM/YYYY). Nouvelle colonne « Dernière réalisation » dans la check-liste PDF.
- En-têtes de tableau passés en `Paragraph` blanc/gras (`_PH`) pour un retour à la ligne propre (évite le chevauchement des colonnes). Largeurs de colonnes ajustées (7 colonnes).
- Vérifié via rendu pdftoppm (check-liste avril 2026 : dates 18/04/2026, 12/04/2025 affichées) + screenshot UI (sélecteur de mois).

## Changelog (2026-06-21c) — Cartouche officiel CHPF revu (logo + pagination dynamique)
- Logo remplacé par le **logo CHPF** officiel (`/app/backend/assets_logo.png`, image001 2.png), affiché en `kind='proportional'`.
- Suppression du label « Intitulé : » (seul le titre centré reste).
- **Pagination dynamique** : « Page : X sur Y » reflète la page courante / total réel, via un canvas personnalisé `make_header_canvas(intitule)` (classe `_HeaderCanvas`, pattern deux-passes) qui dessine le cartouche en haut de **chaque** page. `_build_header_table()` construit le cartouche.
- Ligne du bas droite : la période a été remplacée par la **date de génération** du document (date du jour).
- Les 5 endpoints PDF (air respirable, plan, check-liste, PV mensuel, PV annuel) utilisent `doc.build(elements, canvasmaker=make_header_canvas(intitule))` avec `topMargin=4.9cm` pour laisser la place au cartouche. Import ajouté : `from reportlab.pdfgen import canvas as pdfcanvas`.
- Vérifié via rendu pdftoppm (PV annuel 11 pages : en-tête répété, « Page 1 sur 11 », « Page 2 sur 11 »… + date de génération).

## Changelog (2026-06-21b) — En-tête officiel CHPF sur les PDF
- Logo CHPF extrait de la capture fournie → `/app/backend/assets_logo.png`. Fonction `create_official_header(intitule, meta_period, date_creation)` reproduisant le modèle Word : cellule logo | « Document d'enregistrement » + Intitulé + titre centré | Date de création (20/12/2024 RT) + Page (1 sur 1) + période. Appliquée aux 5 PDF (air respirable, plan, check-liste, PV mensuel, PV annuel).
- Vérifié via rendu pdftoppm (en-tête conforme sur PV mensuel + modèle air respirable).

## Changelog (2026-06-21) — Modèle air respirable PDF + Plan/Check-listes/PV de contrôle (VÉRIFIÉ curl + rendu PDF + UI)
Basé sur 4 documents fournis par l'utilisateur (Calendrier des maintenances.xlsx, Analyse de l'air respirable 2.docx, Check liste MTN caisson.pdf, Contrôle Mensuel.docx).

**A) Modèle PDF « Analyse de l'air respirable » pré-rempli**
- Backend `POST /api/reports/pdf/air-respirable` (body: equipment_id, valeurs, technicien, date, observations) → PDF reprenant le modèle Word : bloc LE COMPRESSEUR (Marque/Modèle/Année(=date_installation)/N° série/Compteur horaire/Réf + cases Essence/Électrique/Diesel), tableau Fluide contrôlé/Valeur constatée/Valeur admissible/Observation (H2O 100mg/m³, CO 5ppm, CO2 500ppm, huile 0.5mg/m³, odeur), observations DRÄGER AEROTEST fixes, signatures.
- Frontend Interventions.jsx : bouton « Imprimer / Télécharger le modèle » (`print-air-respirable-btn`) dans le bloc de relevés air respirable → `reportsAPI.airRespirablePDF` + `openBlobPdf` (nouvel onglet). Pré-rempli avec la fiche compresseur + valeurs saisies.

**B/C/D) Plan, check-listes & PV — placés dans la page « Rapports PDF »**
- Logique partagée `_build_plan_items(year)` : occurrences des maintenances préventives dans l'année via date_planifiee + périodicité. **Exclut journalières/hebdomadaires (périodicité ≤ 7 j)** et équipements réformés. Maintenances horaires (compresseurs, sans périodicité en jours) → placées en **février & août** (2 fois/an) par consigne user. `_times_per_year` : 30j→12, 90j→4, 180j→2, 360j→1, pluriannuel→1.
- `GET /reports/pdf/plan-maintenance/{year}` : regroupé par mois puis par type d'équipement.
- `GET /reports/pdf/check-liste/{year}/{month}` : format check-liste (Intervention/Équipement/Périodicité/Fait/Date/Observations), groupé par type.
- `GET /reports/pdf/pv-controle-mensuel/{year}/{month}` : PV mensuel, groupé par type d'équipement (titre en MAJ).
- `GET /reports/pdf/pv-controle-annuel/{year}` : toutes les maintenances de l'année avec colonne **« Nb / an »** ; dédoublonnage (titre, équipement) ; une maintenance non prévue l'année ≠ affichée.
- Cellules longues rendues en `Paragraph` (retour à la ligne propre). `_P()` helper.
- Frontend Reports.jsx : section « Plan de maintenance, check-listes & PV de contrôle » avec sélecteurs Année + Mois, 4 cartes (Aperçu/Imprimer via viewer in-app + Télécharger). api.js : `planMaintenancePDF/checkListePDF/pvMensuelPDF/pvAnnuelPDF/airRespirablePDF` + helper `openBlobPdf`.
- Vérifié : 5 endpoints HTTP 200, rendu PDF conforme (pdftoppm), UI (bouton air respirable déclenche l'API, viewer PDF s'ouvre pour le PV annuel).
- Redéploiement production requis pour propager le code backend.

## Changelog (2026-06-20m) — Tableaux de relevés personnalisés (Servomex + Air respirable) — VÉRIFIÉ
- **Constat**: la fonctionnalité était déjà implémentée et fonctionnelle. Interventions.jsx détecte la maintenance sélectionnée (useEffect L121) et affiche le tableau de relevés adapté : `servomex_calibrage` (grille LOW/HIGH/ECHELLE × I1-I4) ou `air_respirable` (H2O, CO, CO2, huile, odeur/goût). Stockage backend dans `InterventionBase.mesures` (dict, server.py L512). Affichage dans le détail (L898-925).
- **Cause du « tableau caché » vu au fork précédent**: la maintenance « Analyse de l'air respirable des compresseurs (6 mois) » était au statut `annulee` sur COMP_BAUER 01 (et COMP_LUCHAR réformé) → non sélectionnable dans la liste (filtre planifiee/en_cours) → le tableau ne pouvait pas apparaître. Seul COMP_BAUER 02 l'avait `planifiee`.
- **Action (consigne user: activité sur équipements en service, uniquement sur ces maintenances)**: réactivation (`annulee`→`planifiee`) de « Analyse de l'air respirable » sur les compresseurs EN SERVICE (COMP_BAUER 01). COMP_LUCHAR (réformé) laissé en `annulee`. Servomex déjà `planifiee` sur les 2 pupitres en service. Aucune autre maintenance de BAUER 01 modifiée.
- **Vérifié**: curl (POST intervention avec mesures air_respirable → persisté → supprimé) + navigateur (tableau Servomex sur PUP_CHRONIQUE OK, tableau Air respirable sur COMP_BAUER 01 & 02 OK).
- Redéploiement production requis pour propager le code (la réactivation des données s'applique déjà, base partagée preview/prod).

## Changelog (2026-06-20l) — Filtre par date d'intervention
- Interventions.jsx: ajout de deux champs date (« du » / « au ») filtrant `date_intervention` (comparaison YYYY-MM-DD, gère le format ISO). Bouton « Effacer ». `data-testid` interv-filter-date-from / -to / -reset.
- Vérifié navigateur: période 01→31/07/2026 n'affiche que les interventions de juillet.

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
