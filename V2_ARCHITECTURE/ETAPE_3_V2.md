# ÉTAPE 3 V2 : Générer migration Alembic Phase 0

## 🎯 Objectif
Créer migration Alembic pour les 5 tables Phase 0.

## 📋 Tâches

### Migration
- [ ] Dans `backend/alembic/`, lancer :
  ```bash
  alembic revision --autogenerate -m "add_accounting_core_phase_0"
  ```
- [ ] Éditer `backend/alembic/versions/*_add_accounting_core_phase_0.py`
  - [ ] Vérifier FKs sont correctes
  - [ ] Vérifier constraints (unique, not null)
  - [ ] Vérifier indexes existent
  - [ ] Ajouter manual DDL si besoin (enum types, partitions)
  - [ ] Ajouter rollback (downgrade)
  - [ ] Commenter complexités

### Test migration
- [ ] Environnement test (BD test séparée)
- [ ] Lancer `alembic upgrade head`
- [ ] Vérifier tables créées (SELECT from pg_tables)
- [ ] Tester rollback `alembic downgrade -1`
- [ ] Vérifier tables supprimées
- [ ] Tester upgrade à nouveau
- [ ] ✅ Zéro erreur

### Validation
- [ ] ForeignKeys bien créées (pg_constraint)
- [ ] Indexes bien créés (pg_indexes)
- [ ] Pas de constraint violations
- [ ] Triggers si besoin (audit logs)

## ✅ Livrables
- ✅ Migration Alembic créée
- ✅ Tested upgrade + downgrade
- ✅ Aucun bug

## 📊 Critères de succès
- [ ] `alembic upgrade head` → success
- [ ] `alembic downgrade -1` → success
- [ ] Tables visibles dans `\dt` (psql)
- [ ] Relationships testées (FK constraints)

## ⏱️ Durée estimée
**1-2 heures**

## 🔗 Dépendance
ÉTAPE 2 ✅

## ➡️ Prochaine étape
**ÉTAPE 4** : Populer seed data (templates)

