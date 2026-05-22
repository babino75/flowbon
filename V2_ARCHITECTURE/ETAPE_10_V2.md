# ÉTAPE 10 V2 : Phase 1 – Modèles hiérarchie

## 🎯 Objectif
Ajouter hiérarchie organisationnelle pour gouvernance (manager_id, department_id).

## �141 Tâches

### Modifier User model
- [ ] `backend/app/models/user.py`
  - [ ] Ajouter colonne : `manager_id` (FK User.id, nullable)
  - [ ] Ajouter colonne : `department_id` (FK Department.id, nullable)
  - [ ] Relationship : `manager` (User.manager_id → User.id)
  - [ ] Relationship : `department` (FK Department)
  - [ ] Relationship : `subordinates` (User.manager_id == User.id, reverse)

### Créer Department model
- [ ] `backend/app/models/department.py`
  - [ ] id, company_id, name, parent_department_id (nullable), created_at, updated_at
  - [ ] Relationship : company (FK Company)
  - [ ] Relationship : parent (FK Department, nullable)
  - [ ] Relationship : users (FK User.department_id)

### Créer Team model (optionnel Phase 1)
- [ ] `backend/app/models/team.py`
  - [ ] id, company_id, name, manager_id (FK User), budget (optional)
  - [ ] Relationship : users (M2M Team-User or list FK)

### Migration Alembic
- [ ] Créer migration : `alembic revision --autogenerate -m "add_hierarchy_phase_1"`
  - [ ] Créer table `departments`
  - [ ] Ajouter colonnes à `users`
  - [ ] Créer FKs
  - [ ] Tester upgrade/downgrade
  - [ ] Vérifier reversible

### Données existantes
- [ ] Créer migration data :
  - [ ] Pour chaque company, créer department "Root" (parent_id = null)
  - [ ] Assigner tous users existants à department "Root"
  - [ ] Assigner manager_id : null (pas de manager)
  - [ ] Log : "X users assigned to root department"

### Validation
- [ ] Pas d'import circulaire
- [ ] Type hints OK
- [ ] DB schema validate

## ✅ Livrables
- ✅ User model updated
- ✅ Department model créé
- ✅ Migration créée
- ✅ Existing data migrated

## 📊 Critères de succès
- [ ] Migration up/down OK
- [ ] Aucun user orphelin
- [ ] Aucune FK violation

## ⏱️ Durée estimée
**2-3 heures**

## 🔗 Dépendance
ÉTAPE 9 ✅ (Phase 0 released)

## ➡️ Prochaine étape
**ÉTAPE 11** : Phase 1 Validations gouvernance

