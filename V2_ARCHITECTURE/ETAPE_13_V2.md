# ÉTAPE 13 V2 : Phase 3 – Écritures comptables auto

## 🎯 Objectif
Générer écritures comptables automatiquement lors de changement de statut dépense.

## 📋 Tâches

### Créer générateur d'écritures
- [ ] `backend/app/services/ledger_generator.py` (new)
  - [ ] Fonction `generate_entries_on_approval(db, expense: ExpenseRequest)`
    - [ ] Status : draft → pending : rien
    - [ ] Status : pending → approved : 
      - [ ] Créer 2 LedgerEntry :
        - [ ] Débit : compte dépense, Crédit : compte fournisseur
    - [ ] Log transaction (2 entrées créées)

  - [ ] Fonction `generate_entries_on_paid(db, expense: ExpenseRequest, treasury_account_id)`
    - [ ] Status → paid :
      - [ ] Créer 2 LedgerEntry :
        - [ ] Crédit : compte fournisseur, Débit : compte trésorerie
    - [ ] Log transaction

  - [ ] Fonction `reverse_entries(db, expense: ExpenseRequest)` (si reject/revert)
    - [ ] Chercher LedgerEntry pour expense
    - [ ] Créer LedgerEntry inverses (montants négatifs)

### Hooks dans workflow
- [ ] `backend/app/routes/expenses.py`
  - [ ] POST /expenses/{id}/approve
    - [ ] Appeler `generate_entries_on_approval(db, expense)`
    - [ ] Si erreur : rollback, log error, raise exception
    - [ ] Si success : continue

  - [ ] POST /expenses/{id}/mark-as-paid
    - [ ] Appeler `generate_entries_on_paid(db, expense, treasury_account_id)`
    - [ ] Si erreur : rollback, raise exception
    - [ ] Si success : continue

  - [ ] POST /expenses/{id}/reject
    - [ ] Appeler `reverse_entries(db, expense)` (si déjà approved)

### Tests
- [ ] `backend/tests/test_ledger_generation.py`
  - [ ] Test on_approval : 2 entries créées
  - [ ] Test on_approval : debit account correct
  - [ ] Test on_approval : credit account correct
  - [ ] Test on_approval : amount correct
  - [ ] Test on_paid : 2 entries créées
  - [ ] Test on_paid : accounts correct
  - [ ] Test on_paid : balance after = 0
  - [ ] Test reverse : entries inversées
  - [ ] Test error handling : invalid account

### Validation
- [ ] Créer fonction `validate_ledger_balance(db, company_id, fiscal_year_id) -> bool`
  - [ ] Sum(debit) == Sum(credit)
  - [ ] Retourner True si balanced
  - [ ] Log si not balanced

- [ ] Créer endpoint : GET /accounting/validate/{fiscal_year_id}
  - [ ] Appeler validate_ledger_balance
  - [ ] Retourner status + totals

## ✅ Livrables
- ✅ Générateur d'écritures créé
- ✅ Hooks intégrés dans workflow
- ✅ Validation balance implementée
- ✅ Tests passants

## 📊 Critères de succès
- [ ] Écritures générées automatiquement
- [ ] Balance toujours 0
- [ ] Aucune écriture orpheline
- [ ] Tests > 85% coverage

## ⏱️ Durée estimée
**3-4 heures**

## 🔗 Dépendance
ÉTAPE 12 ✅

## ➡️ Prochaine étape
**ÉTAPE 14** : Phase 4 – UI Admin comptable

