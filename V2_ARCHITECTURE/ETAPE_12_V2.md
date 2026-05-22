# ÉTAPE 12 V2 : Phase 1 Finalization + Phase 2 Start

## 🎯 Objectif
Finaliser Phase 1 (gouvernance) et lancer Phase 2 (trésorerie extensible).

## 📋 Tâches

### Phase 1 Finalization
- [ ] UI Admin : Page `/admin/organization`
  - [ ] Afficher organization chart (tree view)
  - [ ] Ajouter department
  - [ ] Assigner manager
  - [ ] Assigner users à department
  - [ ] Edit department name
  - [ ] Delete department (si empty)

- [ ] Tests Phase 1
  - [ ] Tous tests governance passants
  - [ ] End-to-end : manager approuve dépense subordinate
  - [ ] Régression : V1 toujours ok

- [ ] Documentation Phase 1
  - [ ] User guide : org structure
  - [ ] Admin guide : setup hierarchy
  - [ ] API docs

### Phase 2 Start : Trésorerie extensible
- [ ] Créer `TreasuryAccount` model
  - [ ] id, company_id, name, type (ENUM : CASH, BANK, MOBILE_MONEY, OTHER)
  - [ ] currency, current_balance, is_active
  - [ ] Relationship : company

- [ ] Créer `TreasuryTransaction` model
  - [ ] id, company_id, treasury_account_id, amount, type (debit/credit)
  - [ ] description, transaction_date, created_at
  - [ ] Relationship : expense (FK ExpenseRequest, nullable)
  - [ ] Relationship : advance (FK AdvanceRequest, nullable)

- [ ] Migration
  - [ ] Créer tables
  - [ ] Migrer CashRegister → TreasuryAccount (type=CASH)
  - [ ] Migrer CashTransaction → TreasuryTransaction
  - [ ] Keep old tables (deprecated) pour compatibility

- [ ] Adapter endpoints
  - [ ] Mark old endpoints deprecated
  - [ ] Create new /treasury endpoints (mirror old /cashier logic)
  - [ ] Support both (backward compat 1 sprint)

## ✅ Livrables
- ✅ Phase 1 complete + tested
- ✅ Phase 2 models created
- ✅ Migration prepared
- ✅ Documentation updated

## 📊 Critères de succès
- [ ] Phase 1 all tests pass
- [ ] Phase 2 models compile
- [ ] Migration reversible
- [ ] Zero breaking changes to V1 cashier workflow

## ⏱️ Durée estimée
**4-5 heures** (Phase 1 wrap + Phase 2 start)

## 🔗 Dépendance
ÉTAPE 11 ✅

## ➡️ Prochaine étape
**ÉTAPE 13** : Phase 3 – Comptabilité auto

