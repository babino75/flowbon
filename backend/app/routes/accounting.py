from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.accounting import (
    AccountingAccountCreate,
    AccountingAccountResponse,
    AccountingAccountUpdate,
    CategoryAccountMappingCreate,
    CategoryAccountMappingResponse,
    LedgerEntryResponse,
    AccountingPlanCreate,
    AccountingPlanItemResponse,
)
from app.services.tenant import (
    create_accounting_account,
    get_accounting_account_by_id,
    list_accounting_accounts,
    get_category_account_mapping,
    set_category_account_mapping,
    delete_category_account_mapping,
    get_category_by_id,
    create_category,
    list_categories,
)
from app.models.accounting import AccountingAccount, ExpenseCategoryAccountingMapping
from app.models.expense import ExpenseCategory

router = APIRouter(prefix="/accounting", tags=["Accounting"])


def _ensure_company(current_user: User):
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur sans entreprise")


def _ensure_accounting_role(current_user: User):
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")


@router.get("/plan", response_model=List[AccountingPlanItemResponse])
def get_accounting_plan(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retourne la liste combinée des comptes comptables et de leurs catégories visibles."""
    _ensure_company(current_user)
    
    # Récupérer tous les comptes de l'entreprise
    accounts = list_accounting_accounts(db, current_user.company_id)
    
    result = []
    for acc in accounts:
        # Trouver s'il y a des mappings pour ce compte
        mappings = db.query(ExpenseCategoryAccountingMapping).filter(
            ExpenseCategoryAccountingMapping.accounting_account_id == acc.id
        ).all()
        
        if not mappings:
            result.append({
                "account_id": acc.id,
                "account_code": acc.code,
                "account_name": acc.name,
                "category_id": None,
                "category_name": None,
                "is_active": acc.is_active
            })
        else:
            for m in mappings:
                cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == m.expense_category_id).first()
                result.append({
                    "account_id": acc.id,
                    "account_code": acc.code,
                    "account_name": acc.name,
                    "category_id": cat.id if cat else None,
                    "category_name": cat.name if cat else None,
                    "is_active": acc.is_active
                })
    return result


@router.post("/plan", response_model=AccountingPlanItemResponse, status_code=status.HTTP_201_CREATED)
def create_accounting_plan_item(
    plan_in: AccountingPlanCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Crée simultanément un compte comptable, une catégorie utilisateur et fait le lien."""
    _ensure_company(current_user)
    _ensure_accounting_role(current_user)
    
    # 1. Vérifier ou créer le compte comptable
    account = db.query(AccountingAccount).filter(
        AccountingAccount.company_id == current_user.company_id,
        AccountingAccount.code == plan_in.account_code
    ).first()
    
    if not account:
        account = create_accounting_account(
            db, 
            current_user.company_id, 
            plan_in.account_code, 
            plan_in.account_name
        )
    
    # 2. Vérifier ou créer la catégorie
    category = db.query(ExpenseCategory).filter(
        ExpenseCategory.company_id == current_user.company_id,
        ExpenseCategory.name.ilike(plan_in.category_name)
    ).first()
    
    if not category:
        category = create_category(
            db, 
            current_user.company_id, 
            plan_in.category_name
        )
        if plan_in.category_description:
            category.description = plan_in.category_description
            db.commit()
            
    # 3. Créer le mapping
    set_category_account_mapping(
        db,
        category.id,
        account.id,
        current_user.company_id
    )
    
    return {
        "account_id": account.id,
        "account_code": account.code,
        "account_name": account.name,
        "category_id": category.id,
        "category_name": category.name,
        "is_active": account.is_active
    }


@router.delete("/plan/item")
def remove_plan_item_mapping(
    category_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Supprime le lien entre une catégorie et son compte comptable."""
    _ensure_company(current_user)
    _ensure_accounting_role(current_user)

    category = get_category_by_id(db, category_id, current_user.company_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie introuvable")

    delete_category_account_mapping(db, category_id, current_user.company_id)
    return {"message": "Mapping supprimé"}



@router.get("/accounts", response_model=List[AccountingAccountResponse])
def list_accounts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    return list_accounting_accounts(db, current_user.company_id)


@router.post("/accounts", response_model=AccountingAccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    account_in: AccountingAccountCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_accounting_role(current_user)
    return create_accounting_account(
        db,
        current_user.company_id,
        code=account_in.code,
        name=account_in.name,
        description=account_in.description,
    )


@router.patch("/accounts/{account_id}", response_model=AccountingAccountResponse)
def update_account(
    account_id: UUID,
    account_update: AccountingAccountUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_accounting_role(current_user)

    account = get_accounting_account_by_id(db, account_id, current_user.company_id)
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compte comptable introuvable")

    update_data = account_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)
    return account


@router.get("/categories/{category_id}/accounting-account", response_model=CategoryAccountMappingResponse)
def get_category_mapping(
    category_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    mapping = get_category_account_mapping(db, category_id, current_user.company_id)
    if not mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucun mapping comptable trouvé pour cette catégorie")
    return mapping


@router.put("/categories/{category_id}/accounting-account", response_model=CategoryAccountMappingResponse)
def upsert_category_mapping(
    category_id: UUID,
    mapping_in: CategoryAccountMappingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_accounting_role(current_user)

    category = get_category_by_id(db, category_id, current_user.company_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie introuvable")

    mapping = set_category_account_mapping(
        db,
        category_id,
        mapping_in.accounting_account_id,
        current_user.company_id,
    )
    return mapping


@router.delete("/categories/{category_id}/accounting-account")
def delete_category_mapping_route(
    category_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _ensure_company(current_user)
    _ensure_accounting_role(current_user)

    category = get_category_by_id(db, category_id, current_user.company_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie introuvable")

    delete_category_account_mapping(db, category_id, current_user.company_id)
    return {"message": "Mapping comptable supprimé"}

@router.get("/ledger", response_model=List[LedgerEntryResponse])
def get_ledger_entries(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    _ensure_company(current_user)
    _ensure_accounting_role(current_user)
    
    from app.models.accounting import LedgerEntry
    entries = db.query(LedgerEntry).filter(LedgerEntry.company_id == current_user.company_id).order_by(LedgerEntry.transaction_date.desc()).all()
    return entries
