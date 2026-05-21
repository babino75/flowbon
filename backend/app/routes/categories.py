from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.category import CategoryResponse, CategoryCreate, CategoryUpdate
from app.services.tenant import list_categories, create_category, get_category_by_id

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def get_categories(
    only_active: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company associated")
    return list_categories(db, current_user.company_id, only_active=only_active)

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def add_category(
    category_in: CategoryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Seuls les administrateurs et les comptables peuvent créer des catégories")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company associated")
    
    return create_category(db, current_user.company_id, name=category_in.name, code=category_in.code)

@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category_route(
    category_id: UUID,
    category_update: CategoryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Seuls les administrateurs et les comptables peuvent modifier les catégories")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company associated")
    
    cat = get_category_by_id(db, category_id, current_user.company_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    update_data = category_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cat, field, value)
    
    db.commit()
    db.refresh(cat)
    return cat
