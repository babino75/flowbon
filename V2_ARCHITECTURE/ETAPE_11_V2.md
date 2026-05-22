# ÉTAPE 11 V2 : Phase 1 – Validations gouvernance

## 🎯 Objectif
Implémenter contrôles d'accès basés sur hiérarchie (manager ne peut approuver que subordonnés).

## 📋 Tâches

### Créer fonction de validation
- [ ] `backend/app/core/governance.py` (new file)
  - [ ] Fonction `can_approve_expense(approver: User, expense: ExpenseRequest, db) -> bool`
    - [ ] Si approver.role != "manager" : return False
    - [ ] Si expense.user_id == approver.id : return False (conflit intérêt)
    - [ ] Si expense.user.manager_id != approver.id : return False (pas manager direct)
    - [ ] Retourner True
    - [ ] Log chaque check

  - [ ] Fonction `can_validate_financial(validator: User, expense: ExpenseRequest, db) -> bool`
    - [ ] Si validator.role != "accountant" : return False
    - [ ] Si validator.department_id != expense.user.department_id : return False (même dept)
    - [ ] Retourner True
    - [ ] Log action

  - [ ] Fonction `can_mark_paid(cashier: User, expense: ExpenseRequest, db) -> bool`
    - [ ] Si cashier.role != "cashier" : return False
    - [ ] Vérifier cashier a access au cash_register
    - [ ] Retourner True
    - [ ] Log action

  - [ ] Fonction `get_subordinates(manager: User, db) -> List[User]`
    - [ ] Chercher tous users où manager_id == manager.id
    - [ ] Optionnel : recursive (manager de managers)
    - [ ] Retourner list

### Mettre à jour routes
- [ ] `backend/app/routes/expenses.py`
  - [ ] POST /expenses/{id}/approve
    - [ ] Appeler `can_approve_expense(current_user, expense, db)`
    - [ ] Si False : raise HTTPException(403, "Not authorized")
    - [ ] Si True : proceed
    - [ ] Log : "User X approved expense Y"

  - [ ] POST /expenses/{id}/validate-financial
    - [ ] Appeler `can_validate_financial(current_user, expense, db)`
    - [ ] Si False : raise HTTPException(403, "Not authorized")
    - [ ] Si True : proceed
    - [ ] Log : "User X validated expense Y"

  - [ ] POST /expenses/{id}/mark-as-paid
    - [ ] Appeler `can_mark_paid(current_user, expense, db)`
    - [ ] Si False : raise HTTPException(403, "Not authorized")
    - [ ] Si True : proceed
    - [ ] Log : "User X paid expense Y"

### Respecter le workflow d'édition et de rejet
- [ ] Conserver la logique V1 : seul le créateur peut modifier son bon
  - [ ] Si `expense.user_id != current_user.id` et pas admin, refuser la mise à jour
  - [ ] Pour les non-admins, autoriser les modifications uniquement si le status est `draft`, `pending` ou `rejected`
  - [ ] Interdire la modification après approbation ou paiement
- [ ] Lors d'un rejet, le bon revient au créateur avec un commentaire de rejet
  - [ ] Ajouter `rejection_comment` ou `last_rejection_comment`
  - [ ] Notifier le créateur du renvoi
  - [ ] Empêcher la remontée en approbation tant que le commentaire n'est pas traité
- [ ] Si un manager ou comptable crée un bon, il ne doit jamais se valider/approver lui-même
  - [ ] Self-approval/self-validation doit être bloquée
  - [ ] Si l’auteur est manager/comptable, le bon doit être validé par :
    - un autre manager pour l’approbation métier
    - un autre comptable pour la validation financière
    - un admin ou backup manager/accountant non impliqué dans le bon
  - [ ] Si l’entreprise n’a qu’un seul manager ou comptable, prévoir un `backup_manager` / `backup_accountant`

### Audit logs
- [ ] Créer model `backend/app/models/audit_log.py` (si pas existe)
  - [ ] id, user_id, action, resource_type, resource_id, old_value, new_value, timestamp
  - [ ] Enregistrer toutes modifications governance

- [ ] Intégrer audit dans :
  - [ ] approve_expense → log avec old status, new status
  - [ ] validate_financial → log action
  - [ ] mark_as_paid → log action

### Tests
- [ ] `backend/tests/test_governance.py`
  - [ ] Test can_approve_expense : manager approuve subordinate → True
  - [ ] Test can_approve_expense : manager approuve peer → False
  - [ ] Test can_approve_expense : manager self-approves → False
  - [ ] Test can_approve_expense : non-manager → False
  - [ ] Test can_validate_financial : same dept → True
  - [ ] Test can_validate_financial : different dept → False
  - [ ] Test can_validate_financial : non-accountant → False
  - [ ] Test endpoint approval : unauthorized → 403
  - [ ] Test endpoint approval : authorized → 200
  - [ ] Test audit_log created

## ✅ Livrables
- ✅ Validations implémentées
- ✅ Routes protégées
- ✅ Audit logs générés
- ✅ Tests passants

## 📊 Critères de succès
- [ ] can_approve_expense correctly enforces hierarchy
- [ ] Endpoints return 403 for unauthorized
- [ ] Audit logs track all approvals
- [ ] Tests > 85% coverage

## ⏱️ Durée estimée
**3-4 heures**

## 🔗 Dépendance
ÉTAPE 10 ✅

## ➡️ Prochaine étape
**ÉTAPE 12** : Phase 1 UI Admin (Hiérarchie)

