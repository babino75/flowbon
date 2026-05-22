# ÉTAPE 8 V2 : UI Admin Phase 0 (Frontend)

## 🎯 Objectif
Créer interface pour comptables gérer plan comptable.

## 📋 Tâches

### Mettre à jour API client
- [ ] `frontend/app/lib/api.ts`
  - [ ] Ajouter `getChartOfAccounts()`
  - [ ] Ajouter `createChartOfAccount()`
  - [ ] Ajouter `updateChartOfAccount()`
  - [ ] Ajouter `getAccountingMappings()`
  - [ ] Ajouter `createAccountingMapping()`
  - [ ] Ajouter `getLedger()`
  - [ ] Ajouter `applyTemplate()`

### Créer pages UI

#### Page 1: Plan Comptable
- [ ] `frontend/app/dashboard/accounting/chart-of-accounts/page.tsx`
  - [ ] Afficher table : account_number | account_name | category | is_active
  - [ ] Bouton "Ajouter compte"
  - [ ] Modal form : account_number, account_name, category
  - [ ] Action : Toggle active/inactive
  - [ ] Search : par account_number ou name
  - [ ] Sort : par account_number
  - [ ] Permissions : admin/accountant only

#### Page 2: Mappings
- [ ] `frontend/app/dashboard/accounting/mappings/page.tsx`
  - [ ] Afficher table : expense_category | account | priority | context | is_active
  - [ ] Bouton "Ajouter mapping"
  - [ ] Modal form : select expense_category, select account, priority (1-5), context (optional)
  - [ ] Action : Toggle active/inactive
  - [ ] Action : Delete mapping
  - [ ] Search : par category
  - [ ] Sort : par priority

#### Page 3: Grand Livre
- [ ] `frontend/app/dashboard/accounting/ledger/page.tsx`
  - [ ] Filtrer par fiscal_year (dropdown)
  - [ ] Afficher table : date | description | compte_débit | compte_crédit | montant
  - [ ] Affichage résumé : Total débits | Total crédits | Équilibre (must be 0)
  - [ ] Export à CSV/PDF
  - [ ] Permissions : admin/accountant only

#### Page 4: Templates (optionnel Phase 0)
- [ ] `frontend/app/dashboard/accounting/templates/page.tsx`
  - [ ] Afficher templates disponibles
  - [ ] Bouton "Appliquer template"
  - [ ] Modal confirmer : "Appliquer SYSCOHADA_PME ? Cela créera 80+ comptes."
  - [ ] Disabled si déjà appliqué pour company

### Components réutilisables
- [ ] `components/accounting/ChartOfAccountsTable.tsx`
- [ ] `components/accounting/MappingsTable.tsx`
- [ ] `components/accounting/LedgerTable.tsx`
- [ ] `components/accounting/TemplateSelector.tsx`

### UX/Design
- [ ] Utiliser Tailwind CSS (style cohérent existant)
- [ ] Icons : +, edit, delete, download
- [ ] Loading states
- [ ] Error messages
- [ ] Success toast notifications
- [ ] Responsive (mobile ok ?)
- [ ] Dark mode support (si déjà support V1)

### Tests
- [ ] `frontend/app/dashboard/accounting/__tests__/page.test.tsx`
  - [ ] Test rendering tables
  - [ ] Test API calls
  - [ ] Test permissions check
  - [ ] Test form validation
  - [ ] Test loading/error states

## ✅ Livrables
- ✅ 3-4 pages comptables créées
- ✅ API client updated
- ✅ Components réutilisables
- ✅ Tests frontend passants

## 📊 Critères de succès
- [ ] Pages chargent sans erreur
- [ ] Buttons trigger correct API calls
- [ ] Permissions enforced (non-admin blocked)
- [ ] Forms validate input
- [ ] Responsive design OK
- [ ] No console errors

## ⏱️ Durée estimée
**5-6 heures**

## 🔗 Dépendance
ÉTAPE 7 ✅ (backend tests passed)

## ➡️ Prochaine étape
**ÉTAPE 9** : Phase 0 Finalization & Release

