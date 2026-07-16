# Identifiants de test — HyperbareManager (GMAO caisson hyperbare)

## Compte administrateur
- **Email**: admin@hypermaint.fr
- **Mot de passe**: admin123
- **Rôle**: Administrateur (accès complet)

## Compte technicien de test
- **Email**: tech@hypermaint.fr
- **Mot de passe**: tech12345
- **Rôle**: Technicien
- Note: ce mot de passe peut changer si le flux « mot de passe oublié / mot de passe temporaire » est testé. Le remettre à tech12345 via Admin > Utilisateurs > changer le mot de passe si besoin.

## Base de données
- DB_NAME: hyperbaremanager_prod (NE PAS MODIFIER)

## Notes
- Données réelles importées (équipements, maintenances, budget 2026, bouteilles, pièces).
- Total équipements: 16. 100% des maintenances (work_orders + inspections) reliées à un équipement.
- Envoi d'email (Resend): en mode test, `onboarding@resend.dev` ne livre qu'à l'adresse du propriétaire du compte Resend. Le mot de passe temporaire est toujours affiché à l'admin en repli.
