# ÉTAPE 5 V2 : Implémenter services Phase 0

## 🎯 Objectif
Créer la logique métier pour gestion comptable.

## 📋 Tâches

### Créer accounting_service.py
- [ ] `backend/app/services/accounting_service.py`
  - [ ] Fonction `resolve_account_for_expense(db, expense, company_id, context=None)`
    - [ ] Chercher mapping pour expense.category_id
    - [ ] Priorité : contexte > sans contexte
    - [ ] Retourner ChartOfAccounts ID ou raise exception
    - [ ] Tester avec 1000 mappings
    - [ ] Performance : <50ms
  
  - [ ] Fonction `create_ledger_entry(db, expense, debit_account_id, credit_account_id, amount, description)`
    - [ ] Créer LedgerEntry
    - [ ] Valider : debit_account != credit_account
    - [ ] Valider : amount > 0
    - [ ] Valider : company_id match
    - [ ] Retourner LedgerEntry créée
  
  - [ ] Fonction `apply_template_to_company(db, company_id, template_id)`
    - [ ] Chercher template
    - [ ] Copier tous ChartOfAccounts pour cette company
    - [ ] Créer AccountingMapping 1:1 catégorie → compte
    - [ ] Log action
    - [ ] Retourner count de comptes créés
  
  - [ ] Fonction `list_company_chart(db, company_id, active_only=True)`
    - [ ] Retourner tous ChartOfAccounts pour company
    - [ ] Optionnel : filtrer is_active=True
    - [ ] Ordonner par account_number
  
  - [ ] Fonction `list_mappings(db, company_id, category_id=None)`
    - [ ] Retourner mappings pour company
    - [ ] Optionnel : filtrer par category
    - [ ] Retourner avec chart_of_accounts join
  
  - [ ] Fonction `get_ledger(db, company_id, fiscal_year_id)`
    - [ ] Retourner tous LedgerEntry pour FY
    - [ ] Inclure expense, compte débit, compte crédit
    - [ ] Ordonner par ledger_date
    - [ ] Retourner aussi totaux (sum debit, sum credit)

### Tests unitaires
- [ ] `backend/tests/test_accounting_service.py`
  - [ ] Test resolve_account : happy path
  - [ ] Test resolve_account : no mapping
  - [ ] Test resolve_account : multiple mappings (priorité)
  - [ ] Test create_ledger_entry : valid
  - [ ] Test create_ledger_entry : invalid amount
  - [ ] Test apply_template : counts correct
  - [ ] Test performance : <50ms for 1000 mappings
  - [ ] Coverage > 85%

### Validation
- [ ] Aucun hardcoding
- [ ] Validation des inputs
- [ ] Error handling robuste
- [ ] Logging de toutes actions
- [ ] Type hints complets

## ✅ Livrables
- ✅ `accounting_service.py` complet (6 fonctions)
- ✅ Tests > 85% coverage
- ✅ Performance validée

## 📊 Critères de succès
- [ ] Tous tests passent
- [ ] Performance resolve_account < 50ms (1000 mappings)
- [ ] Aucune régression V1
- [ ] Type hints OK

## ⏱️ Durée estimée
**4-5 heures**

## 🔗 Dépendance
ÉTAPE 4 ✅

## ➡️ Prochaine étape
**ÉTAPE 6** : Créer endpoints FastAPI

