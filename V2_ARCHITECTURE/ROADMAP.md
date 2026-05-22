# 🚀 FlowBon V2 – Architecture Scalable & Flexible

## Vue d'ensemble

FlowBon V2 est une évolution d'un simple "expense tracker" vers une plateforme de **Financial Workflow Operating System configurable**.

**Objectif** : Fournir un moteur financier solide, modulaire et extensible pour PME, ONG et cabinets OHADA.

---

## 📋 État actuel (V1)

### ✅ Points forts
- Workflow d'approbation de dépenses functional
- Gestion d'exercices comptables
- Gestion d'avances et de trésorerie
- Multi-rôles (manager, comptable, caissier)
- Séparation manager/caissier optionnelle
- Dashboard et exports (Excel, PDF)

### ❌ Lacunes identifiées

#### 1. Gouvernance financière
- N'importe quel manager peut approuver n'importe quelle dépense
- N'importe quel comptable peut valider n'importe quelle dépense
- N'importe quel caissier peut accéder à toutes les caisses
- **Manque** : hiérarchie, départements, assignations de responsabilité
- **Risque** : fraude, perte de contrôle interne

#### 2. Architecture comptable
- `expense_categories` mélange UX métier et codes comptables
- Pas de table `chart_of_accounts` (plan comptable réel)
- Pas de mapping `category → account` configurable
- Pas de génération d'écritures comptables / ledger
- Pas de versioning des mappings
- **Impact** : impossible de supporter plusieurs plans comptables

#### 3. Structure organisationnelle
- Pas de concept de département / équipe / projet
- Pas de hiérarchie manager → subordinates
- Pas de relation caissier → caisses assignées
- **Impact** : gouvernance faible, responsabilités floues

#### 4. Trésorerie
- Seul le cash (`CashRegister`) est géré
- Pas de généricité pour banque, mobile money, wallets
- Pas d'architecture extensible

#### 5. Templates & Onboarding
- Seed rigide par `company_type`
- Pas de templates comptables réutilisables
- Pas de personnalisation flexible

---

## 🎯 Vision V2

### ❌ Ce que FlowBon NE DOIT PAS devenir
- Un ERP monolithique (SAP, Odoo)
- Un clone comptable rigide
- Un système rempli de logique OHADA hardcodée
- Une plateforme où tous voient les comptes comptables

### ✅ Ce que FlowBon DOIT devenir
**Une plateforme de :**
- Workflow financier configurable
- Validation & gouvernance
- Comptabilité modulaire
- Trésorerie extensible

**Avec :**
- UX simple pour collaborateurs
- Couche comptable robuste
- Architecture modulaire & scalable
- Audit & traçabilité

---

## 🧱 Architecture V2 Recommandée

### 1. Séparer les concepts métier

#### 🟦 Catégories métier (`ExpenseCategory`)
- **Pour qui** : tous les collaborateurs
- **Usage** : formulaires, bons de dépense
- **Exemples** : Transport, Internet, Mission, Marketing
- **Statut** : à conserver et enrichir

#### 🟩 Comptes comptables (`ChartOfAccounts`)
- **Pour qui** : comptables/admins
- **Usage** : ledger, écritures, exports comptables
- **Exemples** : 625100 (Déplacements), 628000 (Télécommunications)
- **À créer** : nouvelle table

#### 🟨 Mapping intelligent (`AccountingMapping`)
- **Mappe** : catégorie métier → compte comptable
- **Configurable** : par comptable/admin
- **Flexible** : support contexte (projet, département)
- **À créer** : nouvelle table

---

### 2. Gouvernance & Hiérarchie

#### 🟦 Hiérarchie organisationnelle

```
Company
├── Department
│   ├── Team
│   └── User (manager)
│       └── User (subordinates)
└── User
    ├── manager_id (FK User) → "qui approuve mes dépenses"
    ├── department_id (FK Department)
    ├── assigned_caisses (M2M) → "quelles caisses je peux utiliser"
    └── role
```

#### 🟦 Validation par hiérarchie

**Manager** :
- Approuve uniquement les dépenses de ses subordonnés
- Validation : `approver.id == expense.user.manager_id`
- Si le bon est créé par un manager, l’approbation doit être faite par un autre manager ou un admin/backup manager
- Self-approval est strictement interdite

**Comptable** :
- Valide uniquement son département / ses projets
- Validation : `accountant.departments` contient `expense.user.department`
- Si le bon est créé par un comptable, la validation doit être faite par un autre comptable ou un admin/backup accountant
- Self-validation est strictement interdite

**Caissier** :
- Paie uniquement depuis ses caisses assignées
- Validation : `caisse_id` in `cashier.assigned_caisses`

---

### 3. Architecture comptable configurable

#### 🟦 Chart of Accounts (`chart_of_accounts`)

```
id (UUID)
company_id (FK Company)
code (String, ex: "625100")
label (String, ex: "Déplacements")
type (ENUM: EXPENSE, ASSET, LIABILITY, EQUITY, REVENUE)
is_active (Boolean)
archived (Boolean, soft delete)
created_by (FK User)
created_at (DateTime)
updated_at (DateTime)
```

#### 🟦 Accounting Mapping (`accounting_mappings`)

```
id (UUID)
company_id (FK Company)
expense_category_id (FK ExpenseCategory)
chart_account_id (FK ChartOfAccounts)
context_type (ENUM: NONE, PROJECT, DEPARTMENT, nullable)
context_value (String, ex: "project_xyz")
is_active (Boolean)
created_by (FK User)
created_at (DateTime)
updated_at (DateTime)
unique(company_id, expense_category_id, context_type, context_value)
```

#### 🟦 Accounting Templates (`accounting_templates`)

```
id (UUID)
name (String, ex: "SYSCOHADA PME", "SYCEBNL ONG")
description (Text)
accounts (JSON array) → à dupliquer dans ChartOfAccounts
mappings (JSON array) → à dupliquer dans AccountingMappings
created_by (FK User)
is_default (Boolean)
created_at (DateTime)
```

#### 🟦 Ledger Entries (`ledger_entries`)

```
id (UUID)
company_id (FK Company)
fiscal_year_id (FK FiscalYear)
expense_id (FK ExpenseRequest, nullable)
journal (ENUM: PURCHASE, CASH, BANK)
debit_account_id (FK ChartOfAccounts)
credit_account_id (FK ChartOfAccounts)
amount (Numeric)
description (Text)
created_by (FK User)
created_at (DateTime)
reference_date (Date)
```

#### 🟦 Mapping History (`accounting_mapping_history`)

```
id (UUID)
mapping_id (FK AccountingMappings)
old_value (JSON)
new_value (JSON)
changed_by (FK User)
changed_at (DateTime)
reason (Text, optional)
```

---

### 4. Trésorerie extensible

#### 🟦 Treasury Accounts (`treasury_accounts`)

```
id (UUID)
company_id (FK Company)
type (ENUM: CASH, BANK, MOBILE_MONEY, WALLET)
name (String, ex: "Caisse principale", "Compte Ecobank")
currency (String)
current_balance (Numeric)
is_active (Boolean)
created_by (FK User)
created_at (DateTime)
updated_at (DateTime)
metadata (JSON) → infos spécifiques (IBAN, numéro Flooz, etc.)
```

#### 🟦 Treasury Transactions (`treasury_transactions`)

```
id (UUID)
company_id (FK Company)
treasury_account_id (FK TreasuryAccounts)
type (ENUM: ENTRY, EXIT)
amount (Numeric)
source (String, ex: "expense", "advance", "replenish")
description (Text)
reference_id (UUID, ex: expense_id, advance_id)
created_by (FK User)
created_at (DateTime)
```

---

### 5. Modules futurs (branchables)

- **Budgets** : définir budgets par département, projet
- **Banque** : rapprochement bancaire automatique
- **Mobile Money** : intégration Flooz/TMoney/Orange Money
- **Payroll** : gestion paie (extension future)
- **Facturation** : gestion factures clients
- **Analytics** : dashboards financiers avancés
- **Audit** : logs détaillés, conformité

---

## 🎯 Phases de développement

### Phase 0 : Core Stable (2-3 semaines)

**Objectif** : Stabiliser la base avant extension.

#### Modèles à créer
- `ChartOfAccounts`
- `AccountingTemplates`
- `AccountingMappings`
- `LedgerEntries`
- `AccountingMappingHistory`

#### Migrations
- Créer tables ci-dessus
- Dupliquer templates SYSCOHADA PME / SYCEBNL ONG pour tests

#### Services
- `resolve_account_for_expense(category_id, company_id, context)` → retourne le compte comptable
- `create_ledger_entry(expense, chart_account)` → crée écriture
- `get_or_create_default_chart(company_id, template_name)` → onboarding

#### Endpoints (Admin/Comptable)
- `GET /chart-of-accounts` → lister plan comptable
- `POST /chart-of-accounts` → créer compte
- `PATCH /chart-of-accounts/{id}` → modifier compte
- `GET /accounting-mappings` → lister mappings
- `POST /accounting-mappings` → créer mapping
- `GET /accounting-templates` → lister templates

#### Tests
- Vérifier les chemins de données
- Tester la résolution de comptes
- Tester la génération d'écritures

---

### Phase 1 : Gouvernance & Hiérarchie (3-4 semaines)

**Objectif** : Implémenter contrôle interne via hiérarchie.

#### Modèles à modifier
- `User` → ajouter `manager_id`, `department_id`
- Créer `Department`, `Team`

#### Validations à ajouter
- Manager approuve uniquement subordonnés
- Comptable valide uniquement son département
- Caissier accède uniquement ses caisses

#### UI à créer
- Gestion des départements
- Assignation manager/subordinate
- Assignation caissier/caisses

#### Endpoints
- `POST /departments` → créer département
- `PATCH /users/{id}/manager` → assigner manager
- `PATCH /users/{id}/department` → assigner département
- `PUT /cashiers/{id}/caisses` → assigner caisses

---

### Phase 2 : Trésorerie extensible (2-3 semaines)

**Objectif** : Générifier la trésorerie pour futur extension.

#### Modèles à refactorer
- Remplacer `CashRegister` par `TreasuryAccounts`
- Migrer données existantes

#### Migrations
- Créer `TreasuryAccounts`
- Créer `TreasuryTransactions`
- Dupliquer données `CashRegister`

#### Endpoints
- `GET /treasury-accounts` → lister comptes
- `POST /treasury-accounts` → créer compte
- `GET /treasury-accounts/{id}/transactions` → historique

---

### Phase 3 : Comptabilité automatique (3-4 semaines)

**Objectif** : Générer écritures comptables automatiquement.

#### Logique
- À chaque changement d'état (approved, approved_accounting, paid), générer écritures
- Stocker dans `LedgerEntries`

#### Exemples d'écritures

```
Expense Approved:
  Débit: 625100 (Déplacements)
  Crédit: 401XXX (Fournisseur)

Expense Paid (depuis cash):
  Débit: 401XXX (Fournisseur)
  Crédit: 531000 (Caisse)
```

#### Services
- `generate_ledger_entries(expense, status)` → crée les écritures

#### Exports
- Export `LedgerEntries` → format comptable

---

### Phase 4 : UI Admin Comptable (2-3 semaines)

**Objectif** : Interface pour gérer plan comptable.

#### Pages à créer
- `/accounting/chart-of-accounts` → gestion comptes
- `/accounting/mappings` → gestion mappings
- `/accounting/templates` → sélectionner template
- `/accounting/ledger` → visualiser écritures

#### Permissions
- Restreint à `admin` et `accountant`

---

### Phase 5 : Multi-entité (groupe/filiales) (4-5 semaines)

**Objectif** : Support parent → children.

#### Modèles
- `Company.parent_company_id` (FK)
- `CompanyGroup` (optionnel)

#### Logique
- Parent peut voir dashboard consolidated
- Parent peut paramétrer templates globaux
- Chaque enfant a sa propre configuration

#### Permissions
- Parent admin voit tous les enfants
- Enfant admin voit uniquement son entité

---

## 📊 Plan d'action détaillé

### Sprint 0 : Audit & Planning (1 semaine)
- [x] Audit complet du code (FAIT)
- [x] Vision produit clarifiée (FAIT)
- [ ] Détailler schema DB Phase 0
- [ ] Créer fichier migration template

### Sprint 1 : Phase 0 Core (2-3 semaines)
- [ ] Créer modèles SA
- [ ] Créer migrations Alembic
- [ ] Créer services
- [ ] Créer endpoints API
- [ ] Créer tests unitaires
- [ ] Tester intégration

### Sprint 2 : Phase 1 Gouvernance (3-4 semaines)
- [ ] Modifier modèle User
- [ ] Créer modèles Department/Team
- [ ] Ajouter validations d'approbation
- [ ] Créer UI Admin
- [ ] Tester permissions

### Sprint 3 : Phase 2 Trésorerie (2-3 semaines)
- [ ] Créer TreasuryAccounts
- [ ] Migrer CashRegister
- [ ] Adapter endpoints
- [ ] Tester compatibilité V1

### Sprint 4 : Phase 3 Comptabilité (3-4 semaines)
- [ ] Implémenter générateur d'écritures
- [ ] Tester cas réels (SYSCOHADA)
- [ ] Export comptable
- [ ] Audit logs

### Sprint 5 : Phase 4 UI (2-3 semaines)
- [ ] Créer pages accounting
- [ ] Intégrer avec API
- [ ] Tests e2e
- [ ] Documentation

### Sprint 6 : Phase 5 Multi-entité (4-5 semaines)
- [ ] Implémenter hiérarchie
- [ ] Ajouter consolidation
- [ ] UI parent/enfant
- [ ] Tests

---

## 📝 Recommandations immédiates

### À faire maintenant
1. Créer Phase 0 models + migrations
2. Implémenter `resolve_account_for_expense`
3. Ajouter endpoints de base pour chart_of_accounts
4. Tester avec SYSCOHADA PME template

### À éviter
- ❌ Ne pas coder OHADA complet tout de suite
- ❌ Ne pas surcharger l'UI d'options
- ❌ Ne pas perdre de temps sur "perfectionnisme" avant validation métier
- ❌ Ne pas ajouter multi-entité trop tôt

---

## 🔐 Sécurité & Audit

### À ajouter progressivement
- Audit logs pour chaque action (approuve, valide, paie)
- Traçabilité des modifications (mapping, plan comptable)
- Signatures électroniques (approbation)
- Permissions granulaires (ex: "approuver jusqu'à 500k")
- Rate limiting sur endpoints critiques

---

## 💾 Dépendances & Stack

**Backend** : FastAPI, SQLAlchemy, Alembic, PostgreSQL
**Frontend** : Next.js 16, React 19, TypeScript
**Nouvelle dépendance possible** : `python-dateutil` pour gestion exercices

---

## 📞 Points de contact / Questions

- **Qui pilote** : Toi (founder) + tech lead
- **Qui valide specs** : Comptables/cabinets cibles
- **Qui teste** : PME/ONG partenaires

---

## ✅ Succès = 

- ✅ Tous les workflows sans n'importe qui ne peut faire n'importe quoi
- ✅ Plan comptable flexible & configurable
- ✅ Écritures comptables automatiques & auditables
- ✅ Support multi-entité transparent
- ✅ UX simple pour collaborateurs, robuste pour comptables

