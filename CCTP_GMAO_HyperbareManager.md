# CAHIER DES CLAUSES TECHNIQUES PARTICULIÈRES (CCTP)

## Marché de fourniture et mise en œuvre d'une solution de Gestion de Maintenance Assistée par Ordinateur (GMAO) pour équipements hyperbares

---

**Version :** 1.0  
**Date :** Juillet 2025  
**Référence :** CCTP-GMAO-HYPERBARE-2025

---

## TABLE DES MATIÈRES

1. [Préambule](#1-préambule)
2. [Contexte et objectifs du projet](#2-contexte-et-objectifs-du-projet)
3. [Périmètre fonctionnel](#3-périmètre-fonctionnel)
4. [Exigences fonctionnelles détaillées](#4-exigences-fonctionnelles-détaillées)
5. [Exigences techniques générales](#5-exigences-techniques-générales)
6. [Sécurité, gestion des accès et traçabilité](#6-sécurité-gestion-des-accès-et-traçabilité)
7. [Hébergement et déploiement](#7-hébergement-et-déploiement)
8. [Interopérabilité et évolutivité](#8-interopérabilité-et-évolutivité)
9. [Contraintes ergonomiques et accessibilité](#9-contraintes-ergonomiques-et-accessibilité)
10. [Livrables attendus](#10-livrables-attendus)
11. [Critères de recette et validation](#11-critères-de-recette-et-validation)
12. [Annexes](#12-annexes)

---

## 1. PRÉAMBULE

### 1.1 Objet du document

Le présent Cahier des Clauses Techniques Particulières (CCTP) définit les spécifications fonctionnelles et techniques relatives à la fourniture, l'installation, le paramétrage et la mise en service d'une solution de Gestion de Maintenance Assistée par Ordinateur (GMAO) destinée à la gestion d'équipements hyperbares.

### 1.2 Documents de référence

- Code des marchés publics
- Règlement Général sur la Protection des Données (RGPD)
- Normes applicables aux équipements sous pression (directive 2014/68/UE)
- Référentiel Général de Sécurité (RGS)
- Référentiel Général d'Accessibilité pour les Administrations (RGAA)

### 1.3 Glossaire

| Terme | Définition |
|-------|------------|
| GMAO | Gestion de Maintenance Assistée par Ordinateur |
| OT | Ordre de Travail |
| PWA | Progressive Web Application |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| JWT | JSON Web Token |

---

## 2. CONTEXTE ET OBJECTIFS DU PROJET

### 2.1 Contexte

L'entité utilisatrice exploite un ou plusieurs caissons hyperbares nécessitant un suivi rigoureux de maintenance conformément à la réglementation applicable aux équipements sous pression. Ces équipements complexes comprennent de nombreux composants critiques (compresseurs, soupapes, joints, portes, capteurs, systèmes de sécurité) dont la défaillance pourrait compromettre la sécurité des personnes.

La gestion actuelle de la maintenance repose sur des outils non intégrés (tableurs, documents papier) ne permettant pas :
- Une traçabilité complète des interventions
- Un pilotage efficace de la maintenance préventive
- Une visibilité en temps réel sur l'état du parc d'équipements
- Une gestion optimisée des pièces détachées

### 2.2 Objectifs

La mise en place d'une solution GMAO vise à :

**Objectifs opérationnels :**
- Centraliser l'ensemble des données relatives aux équipements et à leur maintenance
- Planifier et suivre les opérations de maintenance préventive selon des calendriers définis
- Tracer l'intégralité des interventions réalisées (maintenance curative et préventive)
- Gérer le stock de pièces détachées avec alertes de seuil
- Suivre les contrôles réglementaires et leurs échéances

**Objectifs de performance :**
- Réduire les temps d'arrêt non planifiés
- Optimiser les coûts de maintenance
- Améliorer la disponibilité des équipements critiques
- Respecter les obligations réglementaires de traçabilité

**Objectifs stratégiques :**
- Disposer d'indicateurs de pilotage fiables
- Préparer les audits réglementaires avec une documentation complète
- Permettre l'évolution vers une gestion multi-sites si nécessaire

### 2.3 Bénéfices attendus

- Amélioration de la fiabilité des équipements
- Conformité réglementaire garantie
- Optimisation des ressources humaines et matérielles
- Traçabilité complète et pérenne
- Aide à la décision pour les investissements de maintenance

---

## 3. PÉRIMÈTRE FONCTIONNEL

### 3.1 Vue d'ensemble

La solution GMAO devra couvrir les domaines fonctionnels suivants :

```
┌─────────────────────────────────────────────────────────────────┐
│                        GMAO HYPERBARE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  GESTION     │  │  GESTION     │  │  MAINTENANCE │          │
│  │  ÉQUIPEMENTS │  │  INTERVENTIONS│  │  PRÉVENTIVE  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  GESTION     │  │  CONTRÔLES   │  │  PIÈCES      │          │
│  │  UTILISATEURS│  │  RÉGLEMENTAIRES│ │  DÉTACHÉES   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  TABLEAU     │  │  RAPPORTS    │  │  EXPORT      │          │
│  │  DE BORD     │  │  PDF         │  │  DONNÉES     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  NOTIFICATIONS│ │  DOCUMENTS   │                            │
│  │  EMAIL       │  │  PHOTOS/PDF  │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Gestion des équipements

La solution devra permettre la gestion complète du parc d'équipements selon une structure hiérarchique :

**Niveau 1 - Caisson hyperbare :**
- Identification unique
- Caractéristiques techniques (modèle, fabricant, pression maximale)
- Date de mise en service
- Normes applicables

**Niveau 2 - Équipements principaux :**
Les types d'équipements suivants devront être gérés a minima :
- Portes et sas
- Joints d'étanchéité
- Soupapes de sécurité
- Compresseurs (avec compteur horaire)
- Capteurs et instruments de mesure
- Systèmes de sécurité

**Niveau 3 - Sous-équipements :**
- Composants rattachés à un équipement principal
- Lien hiérarchique parent-enfant

**Attributs communs :**
- Référence et numéro de série
- Niveau de criticité (critique, haute, normale, basse)
- Statut (en service, en maintenance, hors service)
- Documentation associée (photos, PDF)
- Historique des interventions

### 3.3 Gestion des interventions

La solution devra permettre de tracer deux types d'interventions :

**Maintenance curative :**
- Déclenchée par un ordre de travail (OT)
- Suite à une panne ou dysfonctionnement constaté
- Lien avec l'équipement concerné

**Maintenance préventive :**
- Planifiée selon un calendrier ou un compteur horaire
- Mise à jour automatique de la prochaine échéance après réalisation
- Association avec un contrôle/inspection périodique

**Attributs d'une intervention :**
- Date et durée
- Technicien intervenant
- Actions réalisées
- Observations
- Pièces détachées utilisées (avec déduction du stock)
- Relevé de compteur horaire (pour compresseurs)

### 3.4 Maintenance préventive avec planification récurrente

La solution devra proposer un module complet de gestion de la maintenance préventive :

**Planification calendaire :**
- Périodicités configurables : hebdomadaire, mensuelle, trimestrielle, semestrielle, annuelle, pluriannuelle
- Calcul automatique de la prochaine date d'échéance
- Calendrier visuel sur 52 semaines

**Planification sur compteur horaire :**
- Pour les équipements concernés (compresseurs)
- Déclenchement basé sur un seuil d'heures de fonctionnement
- Suivi de l'historique des relevés de compteur

**Alertes et rappels :**
- Notification avant échéance (paramétrable : 30, 15, 7 jours)
- Alerte de dépassement d'échéance
- Envoi d'emails automatiques

### 3.5 Gestion des techniciens et rôles utilisateurs

La solution devra implémenter une gestion fine des droits d'accès :

**Rôles prédéfinis :**

| Rôle | Droits |
|------|--------|
| Administrateur | Accès complet : paramétrage, gestion des utilisateurs, suppression de données, exports |
| Technicien | Consultation, création et modification d'interventions, mise à jour des compteurs |
| Invité | Consultation seule (après approbation) |

**Fonctionnalités de gestion :**
- Création de comptes utilisateurs par l'administrateur
- Processus d'approbation des demandes d'accès
- Suspension/réactivation de comptes
- Changement de mot de passe self-service

### 3.6 Suivi historique et traçabilité

La solution devra garantir une traçabilité complète :

**Historiques conservés :**
- Toutes les interventions réalisées sur chaque équipement
- Historique des relevés de compteurs horaires
- Historique des contrôles réglementaires
- Mouvements de stock des pièces détachées
- Actions utilisateurs (création, modification, suppression)

**Fonctionnalités d'historique :**
- Recherche et filtrage multicritères
- Export des données historiques
- Conservation pérenne (durée à définir selon réglementation)

---

## 4. EXIGENCES FONCTIONNELLES DÉTAILLÉES

### 4.1 Module Authentification et Sécurité

| Réf. | Exigence | Priorité |
|------|----------|----------|
| AUTH-01 | La solution devra proposer une authentification par identifiant/mot de passe | Obligatoire |
| AUTH-02 | Les mots de passe devront être stockés de manière chiffrée (algorithme bcrypt ou équivalent) | Obligatoire |
| AUTH-03 | Un mécanisme de session sécurisée avec expiration automatique devra être implémenté | Obligatoire |
| AUTH-04 | L'administrateur devra pouvoir créer des comptes utilisateurs | Obligatoire |
| AUTH-05 | Un processus d'approbation des nouveaux comptes devra être disponible | Obligatoire |
| AUTH-06 | Les utilisateurs devront pouvoir modifier leur mot de passe | Obligatoire |
| AUTH-07 | L'administrateur devra pouvoir réinitialiser le mot de passe d'un utilisateur | Obligatoire |
| AUTH-08 | Un mécanisme de suspension/réactivation de comptes devra être disponible | Obligatoire |

### 4.2 Module Gestion du Caisson

| Réf. | Exigence | Priorité |
|------|----------|----------|
| CAIS-01 | La solution devra permettre d'enregistrer les caractéristiques du caisson hyperbare | Obligatoire |
| CAIS-02 | Les informations suivantes devront être renseignables : identifiant, modèle, fabricant, date de mise en service, pression maximale, normes applicables | Obligatoire |
| CAIS-03 | Une zone de description libre devra être disponible | Obligatoire |
| CAIS-04 | La solution devra prévoir l'évolution vers une gestion multi-caissons | Souhaitable |

### 4.3 Module Gestion des Équipements

| Réf. | Exigence | Priorité |
|------|----------|----------|
| EQUIP-01 | La solution devra permettre la gestion complète (CRUD) des équipements | Obligatoire |
| EQUIP-02 | Les types d'équipements devront être paramétrables par l'administrateur | Obligatoire |
| EQUIP-03 | Chaque équipement devra être caractérisé par : type, référence, numéro de série, criticité, statut | Obligatoire |
| EQUIP-04 | Un niveau de criticité à 4 niveaux devra être gérable (critique, haute, normale, basse) | Obligatoire |
| EQUIP-05 | Un statut à 3 états devra être gérable (en service, en maintenance, hors service) | Obligatoire |
| EQUIP-06 | L'ajout de photos et documents PDF devra être possible | Obligatoire |
| EQUIP-07 | Un compteur horaire devra être gérable pour les équipements concernés (compresseurs) | Obligatoire |
| EQUIP-08 | L'historique des relevés de compteur devra être conservé | Obligatoire |
| EQUIP-09 | Un lien avec les interventions réalisées devra être maintenu | Obligatoire |

### 4.4 Module Sous-Équipements

| Réf. | Exigence | Priorité |
|------|----------|----------|
| SEQU-01 | La solution devra permettre la gestion de sous-équipements rattachés à un équipement parent | Obligatoire |
| SEQU-02 | La relation hiérarchique parent-enfant devra être maintenue | Obligatoire |
| SEQU-03 | Les sous-équipements devront disposer des mêmes attributs que les équipements (référence, statut, photos, documents) | Obligatoire |
| SEQU-04 | Le filtrage des sous-équipements par équipement parent devra être possible | Obligatoire |

### 4.5 Module Ordres de Travail

| Réf. | Exigence | Priorité |
|------|----------|----------|
| OT-01 | La solution devra permettre la création d'ordres de travail (OT) | Obligatoire |
| OT-02 | Deux types de maintenance devront être gérés : préventive et corrective | Obligatoire |
| OT-03 | Un système de priorité à 4 niveaux devra être disponible (urgente, haute, normale, basse) | Obligatoire |
| OT-04 | Un workflow de statuts devra être implémenté : planifiée → en cours → terminée/annulée | Obligatoire |
| OT-05 | L'association à un équipement devra être possible | Obligatoire |
| OT-06 | L'assignation à un technicien devra être possible | Obligatoire |
| OT-07 | Une périodicité en jours devra pouvoir être définie | Obligatoire |
| OT-08 | Une périodicité en heures de fonctionnement devra pouvoir être définie | Obligatoire |
| OT-09 | La suppression d'un ordre de travail devra être possible (administrateur uniquement) | Obligatoire |
| OT-10 | L'ajout de documents et photos devra être possible | Souhaitable |

### 4.6 Module Interventions

| Réf. | Exigence | Priorité |
|------|----------|----------|
| INT-01 | La solution devra permettre l'enregistrement des interventions réalisées | Obligatoire |
| INT-02 | Le type d'intervention devra être identifiable : curative ou préventive | Obligatoire |
| INT-03 | L'intervention curative devra pouvoir être liée à un ordre de travail | Obligatoire |
| INT-04 | L'intervention préventive devra pouvoir être liée à une maintenance préventive planifiée | Obligatoire |
| INT-05 | Les informations suivantes devront être renseignables : date, technicien, actions réalisées, observations, durée | Obligatoire |
| INT-06 | Les pièces détachées utilisées devront pouvoir être enregistrées avec déduction automatique du stock | Obligatoire |
| INT-07 | Le relevé de compteur horaire devra pouvoir être saisi (pour équipements concernés) | Obligatoire |
| INT-08 | L'enregistrement d'une intervention préventive devra mettre à jour automatiquement la prochaine date d'échéance | Obligatoire |

### 4.7 Module Contrôles Réglementaires (Inspections)

| Réf. | Exigence | Priorité |
|------|----------|----------|
| INSP-01 | La solution devra permettre le suivi des contrôles réglementaires périodiques | Obligatoire |
| INSP-02 | Les périodicités suivantes devront être gérables : hebdomadaire, mensuel, trimestriel, semestriel, annuel, biannuel, triennal, quinquennal, décennal | Obligatoire |
| INSP-03 | La date de validité devra être calculée automatiquement selon la périodicité | Obligatoire |
| INSP-04 | L'organisme certificateur devra pouvoir être renseigné | Obligatoire |
| INSP-05 | Le résultat du contrôle devra pouvoir être enregistré | Obligatoire |
| INSP-06 | Les procédures et documents associés devront pouvoir être joints (PDF) | Obligatoire |
| INSP-07 | Une alerte d'expiration devra être générée avant l'échéance | Obligatoire |

### 4.8 Module Pièces Détachées

| Réf. | Exigence | Priorité |
|------|----------|----------|
| PIECE-01 | La solution devra permettre la gestion d'un catalogue de pièces détachées | Obligatoire |
| PIECE-02 | Chaque pièce devra être caractérisée par : nom, référence fabricant, type d'équipement concerné | Obligatoire |
| PIECE-03 | La quantité en stock et le seuil minimum devront être gérables | Obligatoire |
| PIECE-04 | Une alerte de stock bas devra être générée automatiquement | Obligatoire |
| PIECE-05 | Les informations fournisseur et prix unitaire devront pouvoir être renseignées | Souhaitable |
| PIECE-06 | L'ajout de photos et fiches techniques (PDF) devra être possible | Souhaitable |
| PIECE-07 | La déduction automatique du stock lors d'une intervention devra être implémentée | Obligatoire |

### 4.9 Module Tableau de Bord

| Réf. | Exigence | Priorité |
|------|----------|----------|
| DASH-01 | La solution devra proposer un tableau de bord synthétique | Obligatoire |
| DASH-02 | Les statistiques suivantes devront être affichées : nombre d'équipements par statut, ordres de travail par statut | Obligatoire |
| DASH-03 | Les alertes actives devront être visibles : maintenances en retard, stocks bas, contrôles expirés | Obligatoire |
| DASH-04 | Un calendrier de maintenance sur 52 semaines devra être affiché | Obligatoire |
| DASH-05 | Les compteurs horaires des compresseurs devront être affichés | Obligatoire |
| DASH-06 | Les maintenances à venir devront être listées avec leurs échéances | Obligatoire |

### 4.10 Module Notifications

| Réf. | Exigence | Priorité |
|------|----------|----------|
| NOTIF-01 | La solution devra permettre l'envoi de notifications par email | Obligatoire |
| NOTIF-02 | Les types de notifications suivants devront être gérés : rappel maintenance, maintenance en retard, stock bas | Obligatoire |
| NOTIF-03 | Une notification de seuil de compteur horaire atteint devra être disponible | Obligatoire |
| NOTIF-04 | Les emails de bienvenue et d'approbation/refus de compte devront être envoyés automatiquement | Souhaitable |
| NOTIF-05 | L'administrateur devra pouvoir déclencher manuellement l'envoi des alertes | Souhaitable |

### 4.11 Module Rapports

| Réf. | Exigence | Priorité |
|------|----------|----------|
| RAP-01 | La solution devra permettre la génération de rapports au format PDF | Obligatoire |
| RAP-02 | Un rapport de statistiques générales devra être disponible | Obligatoire |
| RAP-03 | Un rapport de maintenance filtrable par période devra être disponible | Obligatoire |
| RAP-04 | Une fiche équipement avec historique devra être générée | Obligatoire |
| RAP-05 | Un rapport des interventions filtrable par période devra être disponible | Obligatoire |
| RAP-06 | Un planning de maintenance sur 52 semaines devra être exportable | Souhaitable |

### 4.12 Module Export de Données

| Réf. | Exigence | Priorité |
|------|----------|----------|
| EXP-01 | La solution devra permettre l'export des données au format CSV | Obligatoire |
| EXP-02 | Un export JSON complet de la base de données devra être disponible | Obligatoire |
| EXP-03 | Un export SQL pour sauvegarde/migration devra être disponible | Souhaitable |
| EXP-04 | L'export devra être réservé aux administrateurs | Obligatoire |

---

## 5. EXIGENCES TECHNIQUES GÉNÉRALES

### 5.1 Architecture

| Réf. | Exigence | Priorité |
|------|----------|----------|
| ARCH-01 | La solution devra être basée sur une architecture web client-serveur | Obligatoire |
| ARCH-02 | L'interface utilisateur devra être accessible via un navigateur web standard | Obligatoire |
| ARCH-03 | La solution devra exposer une API REST documentée | Obligatoire |
| ARCH-04 | L'architecture devra permettre une séparation claire entre frontend et backend | Souhaitable |
| ARCH-05 | La solution devra être compatible avec une conteneurisation (Docker) | Souhaitable |

### 5.2 Performance

| Réf. | Exigence | Priorité |
|------|----------|----------|
| PERF-01 | Le temps de réponse des pages principales devra être inférieur à 3 secondes | Obligatoire |
| PERF-02 | La solution devra supporter au minimum 10 utilisateurs simultanés | Obligatoire |
| PERF-03 | La base de données devra supporter un historique de 10 ans minimum | Obligatoire |
| PERF-04 | Les opérations d'export devront être exécutables pour des volumes de plusieurs milliers d'enregistrements | Obligatoire |

### 5.3 Base de données

| Réf. | Exigence | Priorité |
|------|----------|----------|
| BDD-01 | La solution devra utiliser une base de données permettant le stockage de données structurées | Obligatoire |
| BDD-02 | Les données devront être sauvegardables et restaurables | Obligatoire |
| BDD-03 | La base de données devra garantir l'intégrité référentielle des données | Obligatoire |
| BDD-04 | Une procédure de backup automatique devra être documentée | Obligatoire |

### 5.4 Stockage de fichiers

| Réf. | Exigence | Priorité |
|------|----------|----------|
| STOCK-01 | La solution devra permettre le stockage de fichiers (photos, PDF) | Obligatoire |
| STOCK-02 | Les formats acceptés devront inclure a minima : JPG, PNG, PDF | Obligatoire |
| STOCK-03 | Une limite de taille par fichier devra être configurable | Souhaitable |
| STOCK-04 | L'espace de stockage devra être évolutif | Souhaitable |

---

## 6. SÉCURITÉ, GESTION DES ACCÈS ET TRAÇABILITÉ

### 6.1 Authentification et contrôle d'accès

| Réf. | Exigence | Priorité |
|------|----------|----------|
| SEC-01 | L'authentification devra être obligatoire pour accéder à l'application | Obligatoire |
| SEC-02 | Les mots de passe devront respecter une politique de complexité minimale | Obligatoire |
| SEC-03 | Les tokens de session devront avoir une durée de validité limitée | Obligatoire |
| SEC-04 | Un mécanisme de révocation de session devra être disponible | Souhaitable |
| SEC-05 | Les communications devront être chiffrées (HTTPS) | Obligatoire |

### 6.2 Gestion des rôles et permissions

| Réf. | Exigence | Priorité |
|------|----------|----------|
| ROL-01 | Un système de rôles avec permissions différenciées devra être implémenté | Obligatoire |
| ROL-02 | Les actions de suppression devront être réservées aux administrateurs | Obligatoire |
| ROL-03 | Les exports de données devront être réservés aux administrateurs | Obligatoire |
| ROL-04 | La gestion des utilisateurs devra être réservée aux administrateurs | Obligatoire |

### 6.3 Traçabilité et audit

| Réf. | Exigence | Priorité |
|------|----------|----------|
| AUDIT-01 | Toutes les interventions devront être horodatées et associées à un utilisateur | Obligatoire |
| AUDIT-02 | Les modifications critiques devront être tracées | Souhaitable |
| AUDIT-03 | Un historique des connexions devra être conservé | Souhaitable |
| AUDIT-04 | Les données supprimées devront pouvoir être archivées plutôt que définitivement effacées | Souhaitable |

### 6.4 Protection des données personnelles

| Réf. | Exigence | Priorité |
|------|----------|----------|
| RGPD-01 | La solution devra être conforme au RGPD | Obligatoire |
| RGPD-02 | Les données personnelles stockées devront être minimales et justifiées | Obligatoire |
| RGPD-03 | Une procédure de suppression des données personnelles devra être documentée | Obligatoire |

---

## 7. HÉBERGEMENT ET DÉPLOIEMENT

### 7.1 Options d'hébergement

La solution devra pouvoir être déployée selon l'une des modalités suivantes :

**Option A - Hébergement interne (On-premise) :**
- Installation sur serveur interne de l'entité
- Maîtrise complète des données
- Prérequis d'infrastructure à fournir

**Option B - Hébergement externe (Cloud) :**
- Hébergement sur infrastructure cloud
- Localisation des données en France ou Union Européenne obligatoire
- Engagements de disponibilité (SLA) à définir

**Option C - Hébergement hybride :**
- Base de données en interne
- Application sur infrastructure cloud

### 7.2 Exigences de déploiement

| Réf. | Exigence | Priorité |
|------|----------|----------|
| DEP-01 | La procédure de déploiement devra être documentée | Obligatoire |
| DEP-02 | Un environnement de test devra être fourni avant mise en production | Obligatoire |
| DEP-03 | Les mises à jour devront pouvoir être effectuées sans interruption prolongée (< 30 min) | Souhaitable |
| DEP-04 | Une procédure de rollback devra être documentée | Souhaitable |

### 7.3 Disponibilité

| Réf. | Exigence | Priorité |
|------|----------|----------|
| DISPO-01 | La disponibilité cible devra être de 99% minimum (hors maintenance planifiée) | Obligatoire |
| DISPO-02 | Les maintenances planifiées devront être notifiées 48h à l'avance | Obligatoire |
| DISPO-03 | Un plan de continuité d'activité devra être fourni | Souhaitable |

### 7.4 Sauvegarde et restauration

| Réf. | Exigence | Priorité |
|------|----------|----------|
| SAUV-01 | Une sauvegarde quotidienne automatique devra être configurée | Obligatoire |
| SAUV-02 | La rétention des sauvegardes devra être d'au moins 30 jours | Obligatoire |
| SAUV-03 | Une procédure de restauration devra être documentée et testée | Obligatoire |
| SAUV-04 | Le délai de restauration (RTO) devra être inférieur à 4 heures | Souhaitable |

---

## 8. INTEROPÉRABILITÉ ET ÉVOLUTIVITÉ

### 8.1 API et intégration

| Réf. | Exigence | Priorité |
|------|----------|----------|
| API-01 | La solution devra exposer une API REST documentée | Obligatoire |
| API-02 | L'API devra permettre l'extraction des données principales | Obligatoire |
| API-03 | L'authentification à l'API devra être sécurisée (tokens) | Obligatoire |
| API-04 | La documentation de l'API devra être fournie (format OpenAPI/Swagger souhaité) | Souhaitable |

### 8.2 Évolutions futures prévues

La solution devra être conçue pour permettre les évolutions suivantes sans refonte majeure :

| Évolution | Description | Horizon |
|-----------|-------------|---------|
| Multi-caissons | Gestion de plusieurs caissons hyperbares | Court terme |
| Multi-sites | Gestion de plusieurs sites géographiques | Moyen terme |
| Intégration IoT | Connexion avec capteurs pour remontée automatique de données | Moyen terme |
| Module planning avancé | Gestion des ressources et planification d'équipe | Long terme |
| Intégration ERP | Connexion avec système de gestion (achats, comptabilité) | Long terme |

### 8.3 Formats d'échange

| Réf. | Exigence | Priorité |
|------|----------|----------|
| FORMAT-01 | Les exports devront être disponibles aux formats CSV et JSON | Obligatoire |
| FORMAT-02 | Les rapports devront être générés au format PDF | Obligatoire |
| FORMAT-03 | L'import de données initiales devra être possible (format à définir) | Souhaitable |

---

## 9. CONTRAINTES ERGONOMIQUES ET ACCESSIBILITÉ

### 9.1 Ergonomie générale

| Réf. | Exigence | Priorité |
|------|----------|----------|
| ERGO-01 | L'interface devra être intuitive et ne pas nécessiter de formation longue | Obligatoire |
| ERGO-02 | La navigation devra être cohérente sur l'ensemble de l'application | Obligatoire |
| ERGO-03 | Les messages d'erreur devront être explicites et en français | Obligatoire |
| ERGO-04 | Les formulaires devront inclure une validation côté client | Obligatoire |
| ERGO-05 | Une aide contextuelle devra être disponible | Souhaitable |

### 9.2 Responsive design et mobilité

| Réf. | Exigence | Priorité |
|------|----------|----------|
| RESP-01 | L'interface devra être responsive et s'adapter aux écrans de différentes tailles | Obligatoire |
| RESP-02 | L'application devra être utilisable sur tablette | Obligatoire |
| RESP-03 | L'application devra être utilisable sur smartphone (consultation a minima) | Souhaitable |
| RESP-04 | Une version PWA (Progressive Web App) installable devra être proposée | Souhaitable |
| RESP-05 | Un mode hors-ligne partiel devra être disponible | Souhaitable |

### 9.3 Compatibilité navigateurs

| Réf. | Exigence | Priorité |
|------|----------|----------|
| NAV-01 | La solution devra être compatible avec les navigateurs suivants (versions récentes) : Chrome, Firefox, Edge, Safari | Obligatoire |
| NAV-02 | La compatibilité Internet Explorer n'est pas requise | Information |

### 9.4 Accessibilité

| Réf. | Exigence | Priorité |
|------|----------|----------|
| ACCESS-01 | La solution devra respecter a minima le niveau A du RGAA | Souhaitable |
| ACCESS-02 | Les contrastes de couleurs devront être suffisants pour une bonne lisibilité | Obligatoire |
| ACCESS-03 | L'application devra être navigable au clavier | Souhaitable |

### 9.5 Langue et localisation

| Réf. | Exigence | Priorité |
|------|----------|----------|
| LANG-01 | L'interface devra être intégralement en français | Obligatoire |
| LANG-02 | Les formats de date devront être au format français (JJ/MM/AAAA) | Obligatoire |
| LANG-03 | Les formats numériques devront respecter les conventions françaises | Obligatoire |

---

## 10. LIVRABLES ATTENDUS

### 10.1 Livrables logiciels

| Réf. | Livrable | Description |
|------|----------|-------------|
| LIV-01 | Application GMAO | Solution complète déployée et opérationnelle |
| LIV-02 | Code source | Si développement spécifique ou adaptation |
| LIV-03 | Base de données | Structure initialisée avec données de référence |
| LIV-04 | Scripts de déploiement | Procédures automatisées d'installation |

### 10.2 Documentation

| Réf. | Livrable | Description |
|------|----------|-------------|
| DOC-01 | Manuel utilisateur | Guide d'utilisation pour les utilisateurs finaux |
| DOC-02 | Manuel administrateur | Guide de paramétrage et d'administration |
| DOC-03 | Documentation technique | Architecture, API, modèle de données |
| DOC-04 | Procédures d'exploitation | Sauvegarde, restauration, mise à jour |
| DOC-05 | Documentation API | Spécifications des endpoints REST |

### 10.3 Formation

| Réf. | Livrable | Description |
|------|----------|-------------|
| FORM-01 | Formation administrateurs | 1 session de 4 heures minimum |
| FORM-02 | Formation utilisateurs | 1 session de 2 heures minimum |
| FORM-03 | Supports de formation | Présentations et guides de prise en main |

### 10.4 Support et maintenance

| Réf. | Livrable | Description |
|------|----------|-------------|
| SUPP-01 | Garantie | 1 an minimum de garantie corrective |
| SUPP-02 | Support technique | Assistance par email/téléphone |
| SUPP-03 | Maintenance évolutive | Proposition de contrat optionnel |

---

## 11. CRITÈRES DE RECETTE ET VALIDATION

### 11.1 Recette fonctionnelle

La recette fonctionnelle portera sur la vérification de l'ensemble des exigences fonctionnelles obligatoires listées au chapitre 4.

**Critères d'acceptation :**
- 100% des exigences obligatoires doivent être satisfaites
- 80% minimum des exigences souhaitables doivent être satisfaites
- Aucune anomalie bloquante ou majeure non résolue

**Typologie des anomalies :**

| Niveau | Description | Délai de correction |
|--------|-------------|---------------------|
| Bloquante | Fonctionnalité inutilisable, perte de données | 24 heures |
| Majeure | Fonctionnalité dégradée, contournement complexe | 5 jours ouvrés |
| Mineure | Fonctionnalité dégradée, contournement simple | 15 jours ouvrés |
| Évolution | Amélioration suggérée | Backlog |

### 11.2 Recette technique

**Tests de performance :**
- Temps de réponse < 3 secondes sur les pages principales
- Fonctionnement avec 10 utilisateurs simultanés
- Export de données > 1000 enregistrements

**Tests de sécurité :**
- Authentification fonctionnelle
- Contrôle d'accès par rôle vérifié
- Communications HTTPS opérationnelles

**Tests de compatibilité :**
- Validation sur Chrome, Firefox, Edge (dernières versions)
- Validation sur tablette (iPad, Android)
- Validation sur smartphone (consultation)

### 11.3 Scénarios de test

**Scénario 1 - Gestion d'équipement :**
1. Connexion administrateur
2. Création d'un type d'équipement
3. Ajout d'un équipement
4. Ajout d'un sous-équipement lié
5. Upload de photo et PDF
6. Mise à jour du compteur horaire
7. Consultation de l'historique

**Scénario 2 - Cycle de maintenance curative :**
1. Connexion technicien
2. Consultation du tableau de bord
3. Création d'un ordre de travail correctif
4. Enregistrement d'une intervention
5. Utilisation de pièces détachées
6. Clôture de l'ordre de travail
7. Vérification de la mise à jour du stock

**Scénario 3 - Cycle de maintenance préventive :**
1. Création d'une maintenance préventive planifiée
2. Attente de l'échéance (ou simulation)
3. Enregistrement de l'intervention préventive
4. Vérification du calcul automatique de la prochaine échéance
5. Vérification de l'affichage sur le calendrier

**Scénario 4 - Administration :**
1. Connexion administrateur
2. Création d'un compte utilisateur
3. Approbation du compte
4. Export des données (CSV, JSON, SQL)
5. Génération de rapports PDF
6. Déclenchement des alertes email

### 11.4 Procès-verbal de recette

Un procès-verbal de recette sera établi à l'issue des tests, mentionnant :
- La liste des tests effectués et leurs résultats
- La liste des anomalies détectées et leur statut
- Les réserves éventuelles
- La décision de validation (acceptation, acceptation avec réserves, refus)

---

## 12. ANNEXES

### Annexe A - Modèle de données conceptuel

```
┌─────────────────┐       ┌─────────────────┐
│     CAISSON     │       │  TYPE_EQUIP     │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ identifiant     │       │ nom             │
│ modele          │       │ description     │
│ fabricant       │       │ icon            │
│ date_mise_serv  │       └─────────────────┘
│ pression_max    │
│ normes          │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│   EQUIPEMENT    │──────▶│ SOUS_EQUIPEMENT │
├─────────────────┤  1:N  ├─────────────────┤
│ id              │       │ id              │
│ type            │       │ nom             │
│ reference       │       │ reference       │
│ numero_serie    │       │ parent_equip_id │
│ criticite       │       │ statut          │
│ statut          │       │ photos          │
│ compteur_horaire│       │ documents       │
│ photos          │       └─────────────────┘
│ documents       │
└────────┬────────┘
         │
    ┌────┴────┬─────────────────┐
    │         │                 │
    ▼         ▼                 ▼
┌─────────┐ ┌─────────┐   ┌───────────┐
│   OT    │ │INSPECTION│   │INTERVENTION│
├─────────┤ ├─────────┤   ├───────────┤
│ id      │ │ id      │   │ id        │
│ titre   │ │ titre   │   │ type      │
│ type    │ │ type_ctrl│   │ date      │
│ priorite│ │ periodicite│ │ technicien│
│ statut  │ │ date_valid│  │ actions   │
│ date_plan│ │ resultat │  │ pieces    │
└─────────┘ └─────────┘   └───────────┘
                                │
                                ▼
                          ┌───────────┐
                          │PIECE_DETA │
                          ├───────────┤
                          │ id        │
                          │ nom       │
                          │ reference │
                          │ stock     │
                          │ seuil_min │
                          └───────────┘
```

### Annexe B - Glossaire étendu

| Terme | Définition |
|-------|------------|
| Caisson hyperbare | Enceinte pressurisée utilisée en médecine hyperbare |
| Compteur horaire | Dispositif mesurant le temps de fonctionnement d'un équipement |
| Criticité | Niveau d'importance d'un équipement pour la sécurité et le fonctionnement |
| Maintenance corrective | Intervention suite à une panne ou dysfonctionnement |
| Maintenance préventive | Intervention planifiée pour prévenir les pannes |
| Ordre de travail | Document formalisant une demande d'intervention |
| Périodicité | Fréquence de réalisation d'une maintenance ou contrôle |
| PWA | Application web progressive, installable sur mobile |
| RGPD | Règlement Général sur la Protection des Données |
| Seuil minimum | Quantité de stock en-dessous de laquelle une alerte est déclenchée |

### Annexe C - Contacts et références

**Rédacteur du CCTP :**
- [À compléter]

**Service utilisateur :**
- [À compléter]

**Direction des Systèmes d'Information :**
- [À compléter]

---

## Signatures

| Nom | Fonction | Date | Signature |
|-----|----------|------|-----------|
| | Responsable technique | | |
| | Responsable métier | | |
| | Direction | | |

---

*Document généré le [Date] - Version 1.0*
*Référence : CCTP-GMAO-HYPERBARE-2025*
