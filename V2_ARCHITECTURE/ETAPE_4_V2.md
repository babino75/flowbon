# ÉTAPE 4 V2 : Populer templates comptables (Seed Data)

## 🎯 Objectif
Créer templates SYSCOHADA PME/ONG et appliquer lors de création company.

## 📋 Tâches

### Créer seed script
- [ ] `backend/scripts/seed_accounting_templates.py`
  - [ ] Lire templates depuis PHASE_0_DATABASE.md
  - [ ] Créer AccountingTemplate records :
    - [ ] SYSCOHADA_PME (type='profit')
    - [ ] SYSCOHADA_ONG (type='non_profit')
    - [ ] SYSCOHADA_EMPTY (type='custom')
  - [ ] Pour chaque template, créer CompteComptable entries
  - [ ] Comptes inclus :
    - [ ] Actif (10xx, 11xx, 12xx, ...)
    - [ ] Passif (20xx, 21xx, ...)
    - [ ] Produits (70xx, 71xx)
    - [ ] Charges (60xx, 61xx, 62xx)
  - [ ] SQL seed data complète

### Valider templates avec comptable
- [ ] Envoyer liste comptes à comptable partenaire
- [ ] Confirmer :
  - [ ] Les numérotations sont correctes
  - [ ] Les libellés sont exacts
  - [ ] Aucun compte manquant
  - [ ] Pas de comptes en doublon

### Intégrer au workflow company
- [ ] Dans `backend/app/services/tenant.py` (ou new file)
  - [ ] Créer fonction `apply_template_to_company(db, company_id, template_id)`
  - [ ] Copier tous CompteComptable du template vers company
  - [ ] Créer AccountingMapping par défaut (1:1 catégorie → compte)
  - [ ] Log action (qui a appliqué, quand)

### Test seed
- [ ] Lancer script : `python backend/scripts/seed_accounting_templates.py`
- [ ] Vérifier templates créées (SELECT from AccountingTemplate)
- [ ] Vérifier comptes créés (SELECT from ChartOfAccounts)
- [ ] Compter : comptes PME = ~80, comptes ONG = ~85

## ✅ Livrables
- ✅ Script seed fonctionnel
- ✅ 3 templates créés
- ✅ ~250+ comptes comptables seedés
- ✅ Validé comptable métier

## 📊 Critères de succès
- [ ] SYSCOHADA_PME a 80+ comptes
- [ ] SYSCOHADA_ONG a 85+ comptes
- [ ] Tous comptes ont account_number unique
- [ ] Aucun character encoding issue (accents)

## ⏱️ Durée estimée
**2-3 heures** (comptable validation peut prendre 1 jour)

## 🔗 Dépendance
ÉTAPE 3 ✅

## ➡️ Prochaine étape
**ÉTAPE 5** : Implémenter services Phase 0

