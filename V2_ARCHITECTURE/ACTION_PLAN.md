# Plan d'action FlowBon V2 – Jalons et Dépendances

## 📅 Timeline & Sprints

### Sprint 0 : Audit & Planning (1 semaine)
**Dates** : Semaine actuelle
**Objectif** : Valider la direction et préparer la Phase 0

#### Tâches
- [x] Audit complet du codebase (FAIT)
- [x] Clarifier la vision produit (FAIT)
- [x] Créer V2_ARCHITECTURE/ROADMAP.md (FAIT)
- [x] Créer V2_ARCHITECTURE/PHASE_0_DATABASE.md (FAIT)
- [x] Créer V2_ARCHITECTURE/PHASE_0_API_SERVICES.md (FAIT)
- [ ] Présenter à l'équipe / valider direction
- [ ] Valider avec PME/ONG partenaires

#### Livrables
- ✅ Vision produit documentée
- ✅ Architecture Phase 0 détaillée
- 📋 Buy-in de l'équipe

---

### Sprint 1 : Phase 0 Core Stable (2-3 semaines)
**Dates** : Semaine +2 à +4
**Objectif** : Implémenter la couche comptable de base

#### Pré-requis
- Vision validée ✅
- Équipe disponible

#### Tâches backend

##### Modèles & Migrations
- [ ] Créer `ChartOfAccounts` model
- [ ] Créer `AccountingMappings` model
- [ ] Créer `AccountingMappingHistory` model
- [ ] Créer `LedgerEntries` model
- [ ] Créer `AccountingTemplates` model
- [ ] Générer migration Alembic
- [ ] Tester migration reversible
- [ ] Populate seed data (templates)

##### Services
- [ ] Créer `accounting_service.py`
- [ ] Implémenter `resolve_account_for_expense`
- [ ] Implémenter `create_ledger_entry`
- [ ] Implémenter `apply_template_to_company`
- [ ] Implémenter helpers CRUD
- [ ] Tester services isolés

##### API Endpoints
- [ ] Créer `routes/accounting.py`
- [ ] Endpoint `GET /accounting/chart-of-accounts`
- [ ] Endpoint `POST /accounting/chart-of-accounts`
- [ ] Endpoint `PATCH /accounting/chart-of-accounts/{id}`
- [ ] Endpoint `GET /accounting/mappings`
- [ ] Endpoint `POST /accounting/mappings`
- [ ] Endpoint `GET /accounting/ledger/{fiscal_year_id}`
- [ ] Ajouter permissions (admin/accountant)
- [ ] Tester endpoints avec Postman/pytest

##### Schemas
- [ ] Créer `schemas/accounting.py`
- [ ] Schemas ChartOfAccounts (Create, Read, Update)
- [ ] Schemas AccountingMappings (Create, Read)
- [ ] Schemas LedgerEntry (Read)
- [ ] Valider avec Pydantic

#### Tests
- [ ] Tests unitaires `accounting_service.py`
- [ ] Tests endpoints API
- [ ] Test d'intégration : créer dépense → comptes mappés
- [ ] Coverage > 80%

#### Tâches frontend
- [ ] Mettre en jour `frontend/app/lib/api.ts` avec nouveaux endpoints
- [ ] Créer ou adapter page de gestion Plan Comptable v2
- [ ] Page de gestion Mappings
- [ ] Page de visualisation Ledger

#### Documentation
- [ ] API docs (Swagger auto)
- [ ] Seed data fixtures
- [ ] Exemple d'utilisation pour template

#### QA
- [ ] Test E2E : onboarding → template → dépense
- [ ] Performance : résolution compte sur 1000 mappings
- [ ] Vérifier data integrity

#### Livrables
- ✅ 5 tables en produit
- ✅ 7 endpoints fonctionnels
- ✅ Tests > 80% coverage
- ✅ UI de gestion plan comptable
- 📋 Documentation API

---

### Sprint 2 : Phase 1 Gouvernance (3-4 semaines)
**Dates** : Semaine +5 à +9
**Objectif** : Implémenter hiérarchie & contrôles d'accès

#### Pré-requis
- Phase 0 complète ✅
- Tests passants ✅

#### Tâches
- [ ] Modifier modèle `User` : ajouter `manager_id`, `department_id`
- [ ] Créer modèles `Department`, `Team`
- [ ] Créer migration Alembic
- [ ] Migration données existantes
- [ ] Ajouter validations :
  - [ ] Manager approuve uniquement subordonnés
  - [ ] Comptable valide uniquement son département
  - [ ] Caissier accède uniquement ses caisses
- [ ] Créer endpoints :
  - [ ] `POST /departments`
  - [ ] `PATCH /users/{id}/manager`
  - [ ] `PATCH /users/{id}/department`
  - [ ] `PUT /cashiers/{id}/caisses`
- [ ] Ajouter audit logs
- [ ] UI Admin : gestion organisation
- [ ] Tests : vérifier contraintes appliquées
- [ ] Documentation : modèle hiérarchie

#### Livrables
- ✅ Hiérarchie organisationnelle
- ✅ Validations gouvernance
- ✅ Audit logs
- 📋 UI Admin

---

### Sprint 3 : Phase 2 Trésorerie (2-3 semaines)
**Dates** : Semaine +10 à +12
**Objectif** : Génériciser trésorerie

#### Tâches
- [ ] Créer `TreasuryAccounts` model
- [ ] Créer `TreasuryTransactions` model
- [ ] Migration : dupliquer `CashRegister` → `TreasuryAccounts`
- [ ] Adapter endpoints d'expense/advance
- [ ] Tester compatibilité V1
- [ ] Performance : pas de dégradation
- [ ] Documentation : nouveaux types (CASH, BANK, etc.)

#### Livrables
- ✅ Trésorerie extensible
- ✅ Compatibilité V1 garantie
- ✅ Prêt pour Mobile Money (Phase future)

---

### Sprint 4 : Phase 3 Comptabilité (3-4 semaines)
**Dates** : Semaine +13 à +16
**Objectif** : Générer écritures comptables automatiques

#### Tâches
- [ ] Implémenter générateur d'écritures :
  - [ ] Expense approved → débit compte / crédit fournisseur
  - [ ] Expense paid → crédit compte / débit caisse
- [ ] Hook dans workflow dépense
- [ ] Ledger queries & exports (journaux)
- [ ] Tests avec cas réels SYSCOHADA
- [ ] Export format comptable (CSV, JSON)
- [ ] Validation : somme débits = somme crédits
- [ ] UI : visualisation ledger

#### Livrables
- ✅ Écritures auto générées
- ✅ Exports comptables
- ✅ Grand livre visible

---

### Sprint 5 : Phase 4 UI Admin (2-3 semaines)
**Dates** : Semaine +17 à +19
**Objectif** : Interface pour comptables

#### Tâches
- [ ] Page `/accounting/chart-of-accounts` complet
- [ ] Page `/accounting/mappings` complet
- [ ] Page `/accounting/templates` (sélection)
- [ ] Page `/accounting/ledger` (visualisation)
- [ ] Import / Export plan comptable
- [ ] Historique mappings
- [ ] Tests e2e
- [ ] UX review

#### Livrables
- ✅ UI admin complète
- ✅ Expérience comptable fluide

---

### Sprint 6 : Phase 5 Multi-entité (4-5 semaines)
**Dates** : Semaine +20 à +25
**Objectif** : Support hiérarchie d'entités

#### Tâches
- [ ] Modèle parent/enfant
- [ ] Permissions parent → enfants
- [ ] Consolidation dashboard
- [ ] Reporting groupe
- [ ] UI parent view
- [ ] Tests permissions
- [ ] Documentation

#### Livrables
- ✅ Multi-entité fonctionnel
- ✅ Dashboards consolidés

---

## 🎯 Jalons majeurs

| Jalon | Date cible | Statut |
|-------|-----------|--------|
| **M0** Sprint 0 : Vision validée | Fin semaine actuelle | 🟢 |
| **M1** Phase 0 : Core stable | Fin semaine +3 | ⏳ |
| **M2** Phase 1 : Gouvernance | Fin semaine +9 | ⏳ |
| **M3** Phase 2 : Trésorerie | Fin semaine +12 | ⏳ |
| **M4** Phase 3 : Comptabilité auto | Fin semaine +16 | ⏳ |
| **M5** Phase 4 : UI complète | Fin semaine +19 | ⏳ |
| **M6** Phase 5 : Multi-entité | Fin semaine +25 | ⏳ |
| **Beta 1.0** : Toutes phases | Fin semaine +25 | ⏳ |

---

## 🔄 Dépendances entre phases

```
Sprint 0 : Audit & Planning
    ↓
Sprint 1 : Phase 0 (Core Stable)
    ↓ (bloquant)
Sprint 2 : Phase 1 (Gouvernance)
    Sprint 3 : Phase 2 (Trésorerie) -- (parallèle possible après M1)
    Sprint 4 : Phase 3 (Comptabilité)
    Sprint 5 : Phase 4 (UI Admin)
    ↓ (toutes complétées)
Sprint 6 : Phase 5 (Multi-entité)
    ↓
Beta 1.0
```

---

## 📊 Ressources estimées

### Équipe recommandée
- 1x Backend Lead (FastAPI/SQLAlchemy expert)
- 1x Frontend Lead (Next.js expert)
- 1x QA/DevOps
- 1x Product Manager (toi)
- Comptables métier (part-time validation)

### Capacité
- Sprint : 2 semaines
- Vélocité : ~3 sprints par phase x ~3 semaines
- **Total estimé** : 25-30 semaines (~6 mois) du concept à Beta 1.0

---

## 🚀 Déploiement progressif

### Déploiement Phase 0 (M1)
- Déployer sur dev/staging
- Tests avec PME partenaire
- Collecte feedback

### Déploiement Phase 1 (M2)
- Déployer en production
- PME 1 testent gouvernance
- Ajustements

### Déploiement Phases 2-4 (M3-M5)
- Rollout progressif
- Beta testers
- Feedback boucle

### Release Beta 1.0 (M6)
- Production-ready
- Documentation complète
- Support & onboarding

---

## ✅ Critères de succès par phase

### Phase 0
- ✅ 5 tables créées
- ✅ 7 endpoints testé
- ✅ Zéro dégradation de V1
- ✅ Comptables valident le design

### Phase 1
- ✅ Hiérarchie fonctionnelle
- ✅ Validations appliquées
- ✅ Audit logs traçant
- ✅ Aucun risque de fraude identifié

### Phase 2
- ✅ Trésorerie extensible
- ✅ Types multiples (CASH, BANK)
- ✅ Performance maintenue

### Phase 3
- ✅ Écritures auto générées
- ✅ Exports comptables valides
- ✅ Balance vérifiée

### Phase 4
- ✅ UI complète et intuitive
- ✅ Comptables formés
- ✅ NPS > 4/5

### Phase 5
- ✅ Multi-entité testé
- ✅ Consolidation correcte
- ✅ Permissions isolation garantie

---

## 📝 Points de validation

### Avec PME partenaires
- [ ] Phase 0 : est-ce que le mapping comptable est logique ?
- [ ] Phase 1 : est-ce que la gouvernance couvre les cas réels ?
- [ ] Phase 3 : est-ce que les écritures respectent SYSCOHADA ?

### Avec comptables/cabinets
- [ ] UI intuitive pour gestion plan ?
- [ ] Exports répondent aux standards ?
- [ ] Traçabilité suffisante pour audit ?

### Avec utilisateurs opérationnels
- [ ] Performance acceptable ?
- [ ] UX inchangée pour collaborateurs ?

---

## 🎓 Livrables de documentation

Pour chaque phase :
- Architecture ADR (Architecture Decision Record)
- API documentation (Swagger + manuel)
- Migration guide (V1 → V2)
- User guide pour comptables
- Admin guide pour setup
- Troubleshooting / FAQ

---

## 💾 Checklist de livraison

### Code
- [ ] Tests > 80% coverage
- [ ] Linting (pylint, eslint) ✅
- [ ] No security warnings
- [ ] Code review approuvé

### Déploiement
- [ ] Migration scripts testés
- [ ] Rollback plan en place
- [ ] Monitoring alerts configuré
- [ ] Backup en place

### Documentation
- [ ] API docs (Swagger)
- [ ] Architecture docs
- [ ] User guide
- [ ] Admin guide

### QA
- [ ] Tests unitaires passants
- [ ] Tests intégration passants
- [ ] Tests e2e passants
- [ ] Performance baseline établi
- [ ] Load testing effectué

---

## 🎯 Next Step Immédiat

**Action 1** : Approuver la vision et le plan (cette semaine)  
**Action 2** : Assigner backend lead pour Phase 0  
**Action 3** : Planifier Sprint 1 détaillé (tâches jira/asana)  
**Action 4** : Préparer données seed SYSCOHADA

**Date cible pour démarrage Phase 0** : Lundi de la semaine prochaine

