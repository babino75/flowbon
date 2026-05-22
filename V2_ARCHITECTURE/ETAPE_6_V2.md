# ÉTAPE 6 V2 : Créer endpoints FastAPI Phase 0

## 🎯 Objectif
Exposer services Phase 0 via API REST.

## 📋 Tâches

### Créer Schemas Pydantic
- [ ] `backend/app/schemas/accounting.py`
  - [ ] ChartOfAccountsCreate (account_number, account_name, category)
  - [ ] ChartOfAccountsUpdate (account_name, is_active)
  - [ ] ChartOfAccountsRead (id, account_number, account_name, category, is_active)
  - [ ] AccountingMappingCreate (expense_category_id, account_id, priority, context)
  - [ ] AccountingMappingRead (id, expense_category_id, account_id, priority, context, is_active)
  - [ ] LedgerEntryRead (id, ledger_date, description, debit_account, credit_account, amount)
  - [ ] LedgerSummary (total_debit, total_credit, entry_count)
- [ ] `backend/app/schemas/expense.py` (existing schema update)
  - [ ] Ajouter `reference_number` à `ExpenseResponse`
  - [ ] Ajouter optionnel `reference_number` à `ExpenseCreateSchema` si le système permet saisie manuelle
  - [ ] Ajouter `rejection_comment` ou `last_rejection_comment`
  - [ ] Ajouter endpoint de rejet avec commentaire

### Créer Routes
- [ ] `backend/app/routes/accounting.py`

#### Endpoints
1. `GET /accounting/chart-of-accounts`
   - [ ] Query params : ?active_only=true
   - [ ] Retourner list[ChartOfAccountsRead]
   - [ ] Permission : admin, accountant
   - [ ] Scoped : company_id du user

2. `POST /accounting/chart-of-accounts`
   - [ ] Body : ChartOfAccountsCreate
   - [ ] Créer compte
   - [ ] Retourner ChartOfAccountsRead
   - [ ] Permission : admin, accountant
   - [ ] Log action

3. `PATCH /accounting/chart-of-accounts/{id}`
   - [ ] Body : ChartOfAccountsUpdate
   - [ ] Mettre à jour compte
   - [ ] Retourner ChartOfAccountsRead
   - [ ] Permission : admin, accountant
   - [ ] Log action

4. `GET /accounting/mappings`
   - [ ] Query params : ?category_id=x
   - [ ] Retourner list[AccountingMappingRead]
   - [ ] Permission : admin, accountant
   - [ ] Scoped : company_id

5. `POST /accounting/mappings`
   - [ ] Body : AccountingMappingCreate
   - [ ] Créer mapping
   - [ ] Validation : category existe, account existe
   - [ ] Retourner AccountingMappingRead
   - [ ] Permission : admin, accountant
   - [ ] Log action

6. `GET /accounting/ledger/{fiscal_year_id}`
   - [ ] Retourner list[LedgerEntryRead] + LedgerSummary
   - [ ] Permission : admin, accountant
   - [ ] Scoped : company_id
   - [ ] Optional filter : ?expense_id=x

7. `POST /accounting/templates/{template_id}/apply`
   - [ ] Appliquer template à company
   - [ ] Retourner {count: int, chart_id: id}
   - [ ] Permission : admin only
   - [ ] Log action (audit)

### Ajouter au main.py
- [ ] `from backend.app.routes import accounting`
- [ ] `app.include_router(accounting.router, prefix="/api")`

### Tests endpoints
- [ ] `backend/tests/test_accounting_routes.py`
  - [ ] Test GET chart-of-accounts
  - [ ] Test POST chart-of-accounts (valid)
  - [ ] Test POST chart-of-accounts (invalid)
  - [ ] Test PATCH chart-of-accounts
  - [ ] Test GET mappings
  - [ ] Test POST mappings
  - [ ] Test permissions (non-admin rejected)
  - [ ] Test company scoping
  - [ ] Test with Postman/curl

## ✅ Livrables
- ✅ Schemas Pydantic complets
- ✅ 7 endpoints fonctionnels
- ✅ Tests endpoints passants

## 📊 Critères de succès
- [ ] `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/accounting/chart-of-accounts` → 200 OK
- [ ] POST/PATCH validation working
- [ ] Permissions enforcement OK
- [ ] Company scoping OK
- [ ] Swagger docs auto-generated

## ⏱️ Durée estimée
**4-5 heures**

## 🔗 Dépendance
ÉTAPE 5 ✅

## ➡️ Prochaine étape
**ÉTAPE 7** : Tests intégration Phase 0

