from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.expense import ExpenseRequest
from app.models.advance import AdvanceRequest

def can_validate_request(user: User, request_obj: ExpenseRequest | AdvanceRequest, db: Session, action: str = "approve") -> bool:
    """
    Vérifie si l'utilisateur a le droit de valider cette dépense ou avance.
    Se base sur les rôles et le système de Scope (GLOBAL, DEPARTMENT, PROJECT).
    """
    if user.id == request_obj.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Vous ne pouvez pas {action}r votre propre demande."
        )

    allowed_roles = ["manager", "admin", "super_admin"]
    if action == "reject":
        allowed_roles.append("accountant")

    is_authorized = user.role in allowed_roles or user.is_backup_manager
    if action == "reject":
        is_authorized = is_authorized or user.is_backup_accountant

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Vous n'avez pas les droits nécessaires pour {action}r cette demande."
        )

    if user.role in ["admin", "super_admin"] or user.role == "accountant" or user.is_backup_accountant:
        return True

    # 3. Vérification du Scope explicite (pour les managers et backup_managers)
    if user.scope_type == "GLOBAL":
        return True
        
    elif user.scope_type == "DEPARTMENT":
        if not request_obj.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cette demande n'a pas de département assigné, votre scope départemental ne permet pas de la valider."
            )
        if str(user.scope_id) != str(request_obj.department_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez approuver que les demandes de votre département."
            )
        return True
        
    elif user.scope_type == "PROJECT":
        if not request_obj.project_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cette demande n'a pas de projet assigné, votre scope projet ne permet pas de la valider."
            )
        if str(user.scope_id) != str(request_obj.project_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous ne pouvez approuver que les demandes de votre projet."
            )
        return True

    # Si le scope n'est pas reconnu ou non géré
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Périmètre d'action (scope) invalide ou insuffisant."
    )
