from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)
from app.services.tenant import (
    create_department,
    get_department_by_id,
    list_departments,
    update_department_service,
    delete_department_service,
)

router = APIRouter(prefix="/departments", tags=["Departments"])


def _ensure_admin(current_user: User):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé. Administrateur requis.")


def _ensure_company(current_user: User):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur sans entreprise")


@router.get("", response_model=List[DepartmentResponse])
def list_depts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    return list_departments(db, current_user.company_id)


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_dept(
    dept_in: DepartmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_admin(current_user)
    return create_department(db, current_user.company_id, dept_in.name, dept_in.description)


@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_dept(
    dept_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    dept = get_department_by_id(db, dept_id, current_user.company_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Département introuvable")
    return dept


@router.patch("/{dept_id}", response_model=DepartmentResponse)
def update_dept(
    dept_id: UUID,
    dept_update: DepartmentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_admin(current_user)
    
    dept = get_department_by_id(db, dept_id, current_user.company_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Département introuvable")
    
    return update_department_service(db, dept, dept_update.model_dump(exclude_unset=True))


@router.delete("/{dept_id}")
def delete_dept(
    dept_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_admin(current_user)
    
    dept = get_department_by_id(db, dept_id, current_user.company_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Département introuvable")
    
    delete_department_service(db, dept)
    return {"message": "Département supprimé"}
