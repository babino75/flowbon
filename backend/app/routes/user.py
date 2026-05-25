from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.dependencies import get_current_active_user, get_db
from app.core.security import hash_password
from app.models.user import User, UserCompany
from app.models.company import Company
from app.schemas.user import UserCreate, UserRoleUpdate, UserResponse
from app.services.tenant import get_user_for_company, list_users_for_company

router = APIRouter(prefix="/users", tags=["users"])


class ScopeUpdateSchema(BaseModel):
    scope_type: str
    scope_id: Optional[str] = None


@router.get("/me/companies")
def get_my_companies(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retourne toutes les entreprises accessibles par l'utilisateur."""
    links = db.query(UserCompany).filter(
        UserCompany.user_id == current_user.id,
        UserCompany.is_active == True
    ).all()
    result = []
    for link in links:
        company = db.query(Company).filter(Company.id == link.company_id).first()
        if company:
            from app.schemas.company import CompanyResponse
            result.append({
                "company": CompanyResponse.model_validate(company).model_dump(mode="json"),
                "role": link.role,
                "is_active_context": str(current_user.company_id) == str(link.company_id),
            })
    return result


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Entreprise requise pour ajouter un utilisateur")

    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un utilisateur avec cet email existe déjà")

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        company_id=current_user.company_id,
        invited_by=current_user.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[UserResponse])
def list_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return list_users_for_company(db, current_user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    user = get_user_for_company(db, user_id, current_user)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")
    return user


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    user = get_user_for_company(db, user_id, current_user)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    user.role = role_update.role
    
    # If the user is an employee, they cannot have backup roles (fraud prevention)
    if user.role == "employee":
        user.is_backup_manager = False
        user.is_backup_accountant = False
        if role_update.is_backup_manager or role_update.is_backup_accountant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un employé ne peut pas avoir de rôle suppléant pour éviter les fraudes."
            )
    else:
        if role_update.is_backup_manager is not None:
            user.is_backup_manager = role_update.is_backup_manager
        if role_update.is_backup_accountant is not None:
            user.is_backup_accountant = role_update.is_backup_accountant
            
    if role_update.scope_type is not None:
        user.scope_type = role_update.scope_type
        user.scope_id = role_update.scope_id
            
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/departments", response_model=UserResponse)
def update_user_departments(
    user_id: str,
    department_ids: list[str] = Query(default=[]),
    primary_department_id: str | None = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    from uuid import UUID
    from app.models.department import UserDepartment

    user = get_user_for_company(db, user_id, current_user)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    # Clear existing links
    db.query(UserDepartment).filter(UserDepartment.user_id == user.id).delete()
    
    # Add new links
    for dept_id in department_ids:
        try:
            d_uuid = UUID(dept_id)
            is_primary = (primary_department_id and str(d_uuid) == primary_department_id) or (len(department_ids) == 1)
            link = UserDepartment(user_id=user.id, department_id=d_uuid, is_primary=is_primary)
            db.add(link)
        except ValueError:
            continue

    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    user = get_user_for_company(db, user_id, current_user)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    user = get_user_for_company(db, user_id, current_user)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/scope", response_model=UserResponse)
def update_user_scope(
    user_id: str,
    payload: ScopeUpdateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Permet à l'admin de définir le scope (GLOBAL/DEPARTMENT/PROJECT) d'un utilisateur."""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    user = get_user_for_company(db, user_id, current_user)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    if payload.scope_type not in ["GLOBAL", "DEPARTMENT", "PROJECT", "TREASURY"]:
        raise HTTPException(status_code=400, detail="scope_type invalide")

    user.scope_type = payload.scope_type
    user.scope_id = payload.scope_id
    db.commit()
    db.refresh(user)
    return user
