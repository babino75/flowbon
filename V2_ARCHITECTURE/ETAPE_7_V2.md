# ÉTAPE 7 V2 : Tests intégration Phase 0 (Backend)

## 🎯 Objectif
Tester Phase 0 end-to-end sans casser V1.

## 📋 Tâches

### Tests d'intégration
- [ ] `backend/tests/test_accounting_integration.py`
  - [ ] Setup : créer company, user, fiscal_year, expense_category
  - [ ] Test 1 : Appliquer template SYSCOHADA_PME
    - [ ] Vérifier 80+ comptes créés
    - [ ] Vérifier mappings par défaut créées
  - [ ] Test 2 : Créer dépense, résoudre compte
    - [ ] Créer ExpenseRequest
    - [ ] Appeler resolve_account_for_expense()
    - [ ] Vérifier compte retourné correct
  - [ ] Test 3 : Créer écriture comptable
    - [ ] Créer LedgerEntry (débit expense / crédit trésorerie)
    - [ ] Vérifier amounts match
    - [ ] Vérifier FK intégrité
  - [ ] Test 4 : Vérifier V1 inchangée
    - [ ] Créer dépense classique (pas de ledger entry)
    - [ ] Vérifier expense toujours approuvable
    - [ ] Vérifier workflow unchanged

### Tests de régression V1
- [ ] `backend/tests/test_v1_regression.py`
  - [ ] Tous tests V1 doivent passer
  - [ ] Aucun broken import
  - [ ] Aucun database migration issue
  - [ ] Performance tests (avant/après)

### Test avec vraies données
- [ ] Importer dépenses test depuis ÉTAPE_4
- [ ] Pour chaque dépense, résoudre compte
- [ ] Générer ledger pour fiscal_year
- [ ] Vérifier balance comptable (debit == credit)
- [ ] Exporter ledger (CSV)

### Performance test
- [ ] Créer 1000 mappings
- [ ] Appeler resolve_account 1000 fois
- [ ] Mesurer temps moyen (target : <50ms)
- [ ] Mesurer mémoire (target : pas de leak)
- [ ] Load test : 10 concurrent requests

### Coverage
- [ ] Minimum 80% coverage on accounting code
- [ ] Générer rapport : `pytest --cov=backend.app.services.accounting`
- [ ] Identifier uncovered branches
- [ ] Couvrir ou justifier (e.g., edge cases)

## ✅ Livrables
- ✅ Tests intégration passants
- ✅ Aucune régression V1
- ✅ Coverage 80%+
- ✅ Performance baseline établi

## 📊 Critères de succès
- [ ] `pytest backend/tests/test_accounting_integration.py -v` → all pass
- [ ] `pytest backend/tests/test_v1_regression.py -v` → all pass
- [ ] Coverage report 80%+
- [ ] resolve_account perf <50ms avg
- [ ] Load test : 10 req/s OK

## ⏱️ Durée estimée
**3-4 heures**

## 🔗 Dépendance
ÉTAPE 6 ✅

## ➡️ Prochaine étape
**ÉTAPE 8** : UI Admin Phase 0 (Frontend)

