# ÉTAPE 2 V2 : Créer modèles SQLAlchemy Phase 0

## 🎯 Objectif
Implémenter les 5 nouveaux modèles SQLAlchemy sans casser V1.

## 📋 Tâches

### Modèles (backend/app/models/)
- [ ] Mettre à jour `expense.py`
  - [ ] Ajouter `reference_number` (String) au modèle `ExpenseRequest`
  - [ ] Générer `reference_number` automatiquement à la création
  - [ ] Verrouiller `reference_number` après création
  - [ ] Ajouter contrainte unique globale si on veut zero duplicate dans le système
  - [ ] Ajouter `rejection_comment` ou `last_rejection_comment` pour le workflow de renvoi

- [ ] Créer `chart_of_accounts.py`
  - [ ] ChartOfAccounts class (id, company_id, account_number, account_name, category, is_active, created_at, updated_at)
  - [ ] Ajouter FK company_id
  - [ ] Ajouter constraints (unique account_number par company)
  - [ ] Ajouter __repr__ pour debug

- [ ] Créer `accounting_mapping.py`
  - [ ] AccountingMapping class (id, company_id, expense_category_id, account_id, priority, context, is_active)
  - [ ] Ajouter FKs company_id, expense_category_id, chart_of_accounts_id
  - [ ] Index sur (company_id, expense_category_id, priority)
  - [ ] __repr__

- [ ] Créer `accounting_mapping_history.py`
  - [ ] AccountingMappingHistory class (id, company_id, mapping_id, changed_by, old_value, new_value, changed_at)
  - [ ] FKs company_id, mapping_id, user_id (changed_by)
  - [ ] __repr__

- [ ] Créer `ledger_entry.py`
  - [ ] LedgerEntry class (id, company_id, fiscal_year_id, expense_id, debit_account_id, credit_account_id, amount, description, ledger_date, created_at)
  - [ ] FKs company_id, fiscal_year_id, expense_id, chart_of_accounts_id x2
  - [ ] Constraints : debit_amount = credit_amount
  - [ ] __repr__

- [ ] Créer `accounting_template.py`
  - [ ] AccountingTemplate class (id, name, description, country, template_type, is_active, created_at)
  - [ ] Ajouter chart_of_accounts list (1:M)
  - [ ] __repr__

### Integration
- [ ] Ajouter imports dans `backend/app/models/__init__.py`
- [ ] Vérifier pas d'imports circulaires
- [ ] Vérifier dépendances (ExpenseCategory, Company, User, FiscalYear, ExpenseRequest doivent exister)

## ✅ Livrables
- ✅ 5 fichiers modèles créés
- ✅ Imports compilent sans erreur
- ✅ Tous modèles héritent de Base (SQLAlchemy declarative)

## 📊 Critères de succès
- [ ] `python -c "from backend.app.models import ChartOfAccounts; print('OK')"` → OK
- [ ] `python -c "from backend.app.models import AccountingMapping; print('OK')"` → OK
- [ ] `python -c "from backend.app.models import LedgerEntry; print('OK')"` → OK
- [ ] Aucun type hint error
- [ ] Aucun import circulaire

## ⏱️ Durée estimée
**2-3 heures**

## 🔗 Dépendance
ÉTAPE 1 ✅

## ➡️ Prochaine étape
**ÉTAPE 3** : Générer migration Alembic

