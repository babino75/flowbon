# ÉTAPE 15 V2 : Phase 5 – Multi-entité (Parent/Children)

## 🎯 Objectif
Supporter hiérarchie d'entités (parent company peut gérer enfants) + consolidation accounting.

## 📋 Tâches

### Modèles
- [ ] Modifier `Company` model
  - [ ] Ajouter colonne : `parent_company_id` (FK Company.id, nullable)
  - [ ] Relationship : parent_company (FK)
  - [ ] Relationship : child_companies (reverse)

### Migration
- [ ] Créer migration Alembic
  - [ ] Ajouter colonne parent_company_id
  - [ ] Tester upgrade/downgrade

### Permissions
- [ ] Parent company peut voir :
  - [ ] Toutes dépenses enfants
  - [ ] Tous ledgers enfants
  - [ ] Consolidated reporting
  - [ ] Manage enfants users/settings

- [ ] Child company isolated (sauf pour parent)

### Services
- [ ] Créer `backend/app/services/consolidation_service.py`
  - [ ] Fonction `get_consolidated_ledger(db, parent_company_id, fiscal_year_id)`
    - [ ] Aggréger ledgers parent + tous children
    - [ ] Retourner combined ledger

  - [ ] Fonction `get_consolidated_expenses(db, parent_company_id, ...)`
    - [ ] Aggréger expenses parent + children
    - [ ] Group by expense_category

  - [ ] Fonction `get_consolidated_reporting(db, parent_company_id)`
    - [ ] Retourner : balance + reports combinés

### API Endpoints
- [ ] GET /accounting/consolidated/ledger/{fiscal_year_id}
- [ ] GET /accounting/consolidated/expenses
- [ ] GET /accounting/consolidated/reports
- [ ] Permissions : admin/parent company only

### UI
- [ ] Page `/dashboard/admin/entities`
  - [ ] Afficher parent/children tree
  - [ ] Ajouter/edit child
  - [ ] Voir consolidated reporting

- [ ] Page `/dashboard/accounting/consolidated`
  - [ ] Voir consolidated ledger
  - [ ] Voir consolidated reports
  - [ ] Download consolidated PDF

### Tests
- [ ] Test parent sees child data
- [ ] Test child isolated from parent
- [ ] Test consolidation math (sums correct)
- [ ] Test permissions

## ✅ Livrables
- ✅ Parent/child model créé
- ✅ Consolidation services
- ✅ APIs pour consolidated reporting
- ✅ UI pour multi-entité
- ✅ Tests

## 📊 Critères de succès
- [ ] Parent peut voir all children data
- [ ] Consolidation sums correct
- [ ] Child data isolated
- [ ] Permissions enforced

## ⏱️ Durée estimée
**4-5 heures**

## 🔗 Dépendance
ÉTAPE 14 ✅

## ➡️ Prochaine étape
**ÉTAPE 16** : Beta 1.0 – Release & Documentation

