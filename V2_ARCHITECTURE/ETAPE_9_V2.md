# ÉTAPE 9 V2 : Phase 0 Finalization & QA

## 🎯 Objectif
Tester Phase 0 complètement, documenter, déployer staging.

## 📋 Tâches

### QA complète
- [ ] End-to-end test :
  - [ ] Créer company
  - [ ] Appliquer template SYSCOHADA_PME
  - [ ] Créer dépense
  - [ ] Approuver dépense
  - [ ] Vérifier mappings appliqués
  - [ ] Vérifier ledger créée
  - [ ] Visualiser ledger dans UI
  - [ ] Exporter CSV/PDF

- [ ] Régression test :
  - [ ] Tous workflows V1 toujours ok
  - [ ] Dépenses sans ledger ok
  - [ ] Fiscal years ok
  - [ ] Avances ok
  - [ ] Users/roles ok

- [ ] Permission test :
  - [ ] Admin peut créer comptes
  - [ ] Accountant peut créer comptes
  - [ ] Employee ne peut pas
  - [ ] Manager ne peut pas

- [ ] Data integrity test :
  - [ ] FK constraints enforced
  - [ ] Unique constraints enforced
  - [ ] No orphaned records

### Documentation
- [ ] Créer `PHASE_0_DEPLOYMENT.md`
  - [ ] Migration steps (old BD → new)
  - [ ] Data backup before
  - [ ] Rollback procedure
  - [ ] Verification steps post-deploy

- [ ] Créer `PHASE_0_USER_GUIDE.md`
  - [ ] Screenshots UI
  - [ ] How to add accounts
  - [ ] How to add mappings
  - [ ] How to view ledger
  - [ ] FAQ

- [ ] Créer `PHASE_0_API_GUIDE.md`
  - [ ] Swagger link
  - [ ] Example curl requests
  - [ ] Error codes
  - [ ] Rate limits

### Performance baseline
- [ ] Créer `PHASE_0_PERFORMANCE.md`
  - [ ] Response times (GET/POST/PATCH)
  - [ ] Query performance (resolve_account)
  - [ ] DB size before/after
  - [ ] Memory usage before/after

### Déploiement staging
- [ ] Deploy backend sur staging
  - [ ] `git pull origin main`
  - [ ] `alembic upgrade head` (staging BD)
  - [ ] `pytest backend/tests/` (100% pass)
  - [ ] Démarrer server
  - [ ] Smoke tests

- [ ] Deploy frontend sur staging
  - [ ] `npm install`
  - [ ] `npm run build`
  - [ ] `npm run start`
  - [ ] Vérifier pages charges

- [ ] Integration test staging
  - [ ] Login as admin
  - [ ] Navigate to /accounting pages
  - [ ] Test add account
  - [ ] Test add mapping
  - [ ] Test view ledger

### Feedback comptable
- [ ] Envoyer staging link à comptable partenaire
- [ ] Demander feedback :
  - [ ] UI intuitive ?
  - [ ] Workflows logiques ?
  - [ ] Données correctes ?
  - [ ] Manque quelque chose ?
- [ ] Intégrer feedback
- [ ] Retest

### Sign-off
- [ ] Comptable confirms OK
- [ ] Backend lead confirms OK
- [ ] Frontend lead confirms OK
- [ ] PM (toi) confirms OK

## ✅ Livrables
- ✅ Phase 0 fully tested
- ✅ Documentation complète
- ✅ Staging deployment OK
- ✅ Comptable sign-off

## 📊 Critères de succès
- [ ] Zero critical bugs
- [ ] Zero performance regression
- [ ] All tests pass
- [ ] Staging fully functional
- [ ] Comptable approves
- [ ] Ready for production

## ⏱️ Durée estimée
**3-4 jours** (comptable feedback peut prendre temps)

## 🔗 Dépendance
ÉTAPE 8 ✅

## ➡️ Prochaine étape
**ÉTAPE 10** : Phase 1 Commencer (Gouvernance)

