# ÉTAPE 14 V2 : Phase 4 – UI Admin comptable complète

## 🎯 Objectif
Créer interface complète pour comptables gérer accounting + ledger + reporting.

## 📋 Tâches

### Pages UI

#### Page 1 : Dashboard comptable
- [ ] `/dashboard/accounting/home`
  - [ ] Résumé fiscal year actuelle :
    - [ ] Total dépenses approuvées
    - [ ] Total dépenses payées
    - [ ] Total en attente
  - [ ] Quick stats : balance ledger, nb écritures
  - [ ] Liens vers autres pages

#### Page 2 : Gestion Plan Comptable v2
- [ ] `/dashboard/accounting/chart-of-accounts` (améliorer ÉTAPE_8)
  - [ ] Search + Filter
  - [ ] Bulk import/export CSV
  - [ ] Historique modifications
  - [ ] Validation : no orphaned accounts

#### Page 3 : Gestion Mappings
- [ ] `/dashboard/accounting/mappings` (améliorer ÉTAPE_8)
  - [ ] Afficher toutes mappings avec priority
  - [ ] Tester mapping : "si dépense X, quel compte ?"
  - [ ] Historique changes (audit trail)
  - [ ] Versioning (voir anciennes versions)

#### Page 4 : Grand Livre complète
- [ ] `/dashboard/accounting/ledger` (améliorer ÉTAPE_8)
  - [ ] Filtrer fiscal_year, date range, account
  - [ ] Afficher : date, description, compte_débit, compte_crédit, montant
  - [ ] Totals : sum debit, sum credit, difference
  - [ ] Export : PDF (journal comptable), CSV, Excel
  - [ ] Print view

#### Page 5 : Rapports comptables
- [ ] `/dashboard/accounting/reports`
  - [ ] Balance comptable (compte / montant)
  - [ ] Compte de résultat (produits - charges)
  - [ ] État trésorerie
  - [ ] Bilan (si applicable)
  - [ ] Export PDF/Excel

#### Page 6 : Audit Trail
- [ ] `/dashboard/accounting/audit-trail`
  - [ ] Afficher tous changements : user, action, date, before/after
  - [ ] Filtrer par user, action, date range
  - [ ] Certifier périodiquement

### Composants
- [ ] Améliorer tous components de ÉTAPE_8
  - [ ] Add search/filter
  - [ ] Add export buttons
  - [ ] Add pagination
  - [ ] Add sorting
  - [ ] Better UX

### API updates
- [ ] `frontend/app/lib/api.ts`
  - [ ] Ajouter endpoints pour reports
  - [ ] Ajouter endpoints pour audit trail
  - [ ] Ajouter export PDF/Excel

### Tests frontend
- [ ] Tests pour toutes pages
- [ ] Test loading states
- [ ] Test error handling
- [ ] Test permissions

## ✅ Livrables
- ✅ 6 pages UI créées
- ✅ Complète reporting
- ✅ Audit trail visible
- ✅ Export fonctionnel

## 📊 Critères de succès
- [ ] Comptable peut gérer plan comptable
- [ ] Comptable peut voir grand livre
- [ ] Comptable peut exporter rapports
- [ ] Audit trail traçable

## ⏱️ Durée estimée
**5-6 heures**

## 🔗 Dépendance
ÉTAPE 13 ✅

## ➡️ Prochaine étape
**ÉTAPE 15** : Phase 5 – Multi-entité

