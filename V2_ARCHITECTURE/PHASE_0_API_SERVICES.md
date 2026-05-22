# Phase 0 : Core Stable – APIs et Services

## Services à créer

### 1. Service `accounting_service.py`

```python
# backend/app/services/accounting_service.py

from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.chart_of_accounts import ChartOfAccounts
from app.models.accounting_mapping import AccountingMapping, ContextType
from app.models.accounting_template import AccountingTemplate
from app.models.ledger_entry import LedgerEntry
from app.models.expense import ExpenseRequest
from app.models.fiscal_year import FiscalYear
from app.models.user import User


def resolve_account_for_expense(
    db: Session,
    company_id: UUID,
    expense_category_id: UUID,
    context_type: str = ContextType.NONE.value,
    context_value: Optional[str] = None
) -> Optional[ChartOfAccounts]:
    """
    Résout le compte comptable pour une catégorie de dépense.
    Cherche le mapping le plus spécifique (avec contexte) puis le mapping générique.
    """
    # Essayer d'abord le mapping avec contexte
    if context_type != ContextType.NONE.value and context_value:
        mapping = db.query(AccountingMapping).filter(
            AccountingMapping.company_id == company_id,
            AccountingMapping.expense_category_id == expense_category_id,
            AccountingMapping.context_type == context_type,
            AccountingMapping.context_value == context_value,
            AccountingMapping.is_active == True,
        ).first()
        if mapping:
            return mapping.chart_account

    # Sinon, retourner le mapping générique
    mapping = db.query(AccountingMapping).filter(
        AccountingMapping.company_id == company_id,
        AccountingMapping.expense_category_id == expense_category_id,
        AccountingMapping.context_type == ContextType.NONE.value,
        AccountingMapping.is_active == True,
    ).first()
    
    return mapping.chart_account if mapping else None


def create_ledger_entry(
    db: Session,
    company_id: UUID,
    fiscal_year_id: UUID,
    expense_id: Optional[UUID],
    journal: str,
    debit_account_id: UUID,
    credit_account_id: UUID,
    amount: float,
    description: str,
    reference_date,
    created_by: UUID
) -> LedgerEntry:
    """Crée une écriture de grand livre."""
    entry = LedgerEntry(
        company_id=company_id,
        fiscal_year_id=fiscal_year_id,
        expense_id=expense_id,
        journal=journal,
        debit_account_id=debit_account_id,
        credit_account_id=credit_account_id,
        amount=amount,
        description=description,
        reference_date=reference_date,
        created_by=created_by,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def create_chart_of_accounts(
    db: Session,
    company_id: UUID,
    code: str,
    label: str,
    account_type: str,
    created_by: UUID,
    description: Optional[str] = None
) -> ChartOfAccounts:
    """Crée un nouveau compte comptable."""
    account = ChartOfAccounts(
        company_id=company_id,
        code=code,
        label=label,
        type=account_type,
        created_by=created_by,
        description=description,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def list_chart_of_accounts(
    db: Session,
    company_id: UUID,
    only_active: bool = True
) -> list[ChartOfAccounts]:
    """Liste les comptes comptables de l'entreprise."""
    query = db.query(ChartOfAccounts).filter(ChartOfAccounts.company_id == company_id)
    if only_active:
        query = query.filter(ChartOfAccounts.is_active == True, ChartOfAccounts.archived == False)
    return query.order_by(ChartOfAccounts.code).all()


def create_accounting_mapping(
    db: Session,
    company_id: UUID,
    expense_category_id: UUID,
    chart_account_id: UUID,
    created_by: UUID,
    context_type: str = ContextType.NONE.value,
    context_value: Optional[str] = None
) -> AccountingMapping:
    """Crée un mapping entre catégorie et compte."""
    mapping = AccountingMapping(
        company_id=company_id,
        expense_category_id=expense_category_id,
        chart_account_id=chart_account_id,
        context_type=context_type,
        context_value=context_value,
        created_by=created_by,
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


def list_accounting_mappings(
    db: Session,
    company_id: UUID,
    only_active: bool = True
) -> list[AccountingMapping]:
    """Liste les mappings de l'entreprise."""
    query = db.query(AccountingMapping).filter(AccountingMapping.company_id == company_id)
    if only_active:
        query = query.filter(AccountingMapping.is_active == True)
    return query.all()


def apply_template_to_company(
    db: Session,
    company_id: UUID,
    template_name: str,
    created_by: UUID
) -> tuple[list, list]:
    """Duplique un template comptable dans une entreprise."""
    template = db.query(AccountingTemplate).filter(
        AccountingTemplate.name == template_name
    ).first()
    
    if not template:
        raise ValueError(f"Template '{template_name}' not found")
    
    created_accounts = []
    created_mappings = []
    
    # Créer les comptes
    for account_data in template.accounts:
        account = create_chart_of_accounts(
            db, company_id,
            account_data.get("code"),
            account_data.get("label"),
            account_data.get("type"),
            created_by,
            account_data.get("description")
        )
        created_accounts.append(account)
    
    # Créer les mappings
    # Note: À adapter selon la structure du template
    for mapping_data in template.mappings:
        # Exemple simplifié — à adapter selon tes besoins
        pass
    
    return created_accounts, created_mappings


def get_ledger_by_fiscal_year(
    db: Session,
    fiscal_year_id: UUID
) -> list[LedgerEntry]:
    """Récupère toutes les écritures d'un exercice."""
    return db.query(LedgerEntry).filter(
        LedgerEntry.fiscal_year_id == fiscal_year_id
    ).order_by(LedgerEntry.reference_date, LedgerEntry.created_at).all()
```

---

## Endpoints à créer

### Route : `backend/app/routes/accounting.py`

```python
# backend/app/routes/accounting.py

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.accounting import (
    ChartOfAccountsResponse,
    ChartOfAccountsCreate,
    ChartOfAccountsUpdate,
    AccountingMappingResponse,
    AccountingMappingCreate,
    LedgerEntryResponse,
)
from app.services.accounting_service import (
    create_chart_of_accounts,
    list_chart_of_accounts,
    create_accounting_mapping,
    list_accounting_mappings,
    get_ledger_by_fiscal_year,
)

router = APIRouter(prefix="/accounting", tags=["accounting"])


# ─── Chart of Accounts ─────────────────────────────────────────

@router.get("/chart-of-accounts", response_model=List[ChartOfAccountsResponse])
def get_chart_of_accounts(
    only_active: bool = Query(True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Lister le plan comptable de l'entreprise."""
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Entreprise requise")
    
    return list_chart_of_accounts(db, current_user.company_id, only_active=only_active)


@router.post("/chart-of-accounts", response_model=ChartOfAccountsResponse, status_code=status.HTTP_201_CREATED)
def add_chart_of_accounts(
    data: ChartOfAccountsCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Ajouter un compte comptable."""
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Entreprise requise")
    
    # Vérifier que le code n'existe pas déjà
    from app.models.chart_of_accounts import ChartOfAccounts
    existing = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.company_id == current_user.company_id,
        ChartOfAccounts.code == data.code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ce code de compte existe déjà")
    
    return create_chart_of_accounts(
        db, current_user.company_id,
        data.code, data.label, data.type,
        current_user.id,
        data.description
    )


@router.patch("/chart-of-accounts/{account_id}", response_model=ChartOfAccountsResponse)
def update_chart_of_accounts(
    account_id: UUID,
    data: ChartOfAccountsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Modifier un compte comptable."""
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Entreprise requise")
    
    from app.models.chart_of_accounts import ChartOfAccounts
    account = db.query(ChartOfAccounts).filter(
        ChartOfAccounts.id == account_id,
        ChartOfAccounts.company_id == current_user.company_id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    
    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(account, field, value)
    
    db.commit()
    db.refresh(account)
    return account


# ─── Accounting Mappings ──────────────────────────────────────

@router.get("/mappings", response_model=List[AccountingMappingResponse])
def get_mappings(
    only_active: bool = Query(True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Lister les mappings catégorie → compte."""
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Entreprise requise")
    
    return list_accounting_mappings(db, current_user.company_id, only_active=only_active)


@router.post("/mappings", response_model=AccountingMappingResponse, status_code=status.HTTP_201_CREATED)
def add_mapping(
    data: AccountingMappingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Créer un mapping."""
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Entreprise requise")
    
    return create_accounting_mapping(
        db, current_user.company_id,
        data.expense_category_id,
        data.chart_account_id,
        current_user.id,
        data.context_type,
        data.context_value
    )


# ─── Ledger ────────────────────────────────────────────────────

@router.get("/ledger/{fiscal_year_id}", response_model=List[LedgerEntryResponse])
def get_ledger(
    fiscal_year_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Visualiser le grand livre d'un exercice."""
    if current_user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Entreprise requise")
    
    # Vérifier que l'exercice appartient à l'entreprise
    from app.models.fiscal_year import FiscalYear
    fy = db.query(FiscalYear).filter(
        FiscalYear.id == fiscal_year_id,
        FiscalYear.company_id == current_user.company_id
    ).first()
    if not fy:
        raise HTTPException(status_code=404, detail="Exercice non trouvé")
    
    return get_ledger_by_fiscal_year(db, fiscal_year_id)
```

---

## Schemas à créer

### `backend/app/schemas/accounting.py`

```python
# backend/app/schemas/accounting.py

from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date


class ChartOfAccountsCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)
    label: str = Field(..., min_length=1, max_length=255)
    type: str  # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    description: Optional[str] = None


class ChartOfAccountsUpdate(BaseModel):
    label: Optional[str] = None
    is_active: Optional[bool] = None
    archived: Optional[bool] = None
    description: Optional[str] = None


class ChartOfAccountsResponse(BaseModel):
    id: UUID
    company_id: UUID
    code: str
    label: str
    type: str
    is_active: bool
    archived: bool
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccountingMappingCreate(BaseModel):
    expense_category_id: UUID
    chart_account_id: UUID
    context_type: str = "none"
    context_value: Optional[str] = None


class AccountingMappingResponse(BaseModel):
    id: UUID
    company_id: UUID
    expense_category_id: UUID
    chart_account_id: UUID
    context_type: str
    context_value: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LedgerEntryResponse(BaseModel):
    id: UUID
    company_id: UUID
    fiscal_year_id: UUID
    expense_id: Optional[UUID]
    journal: str
    debit_account_id: UUID
    credit_account_id: UUID
    amount: float
    description: Optional[str]
    reference_date: date
    created_at: datetime

    class Config:
        from_attributes = True
```

---

## Intégration dans `main.py`

```python
# backend/app/main.py

# ... existing code ...

from app.routes import accounting

# ... existing router includes ...

app.include_router(accounting.router)
```

---

## Tests unitaires Phase 0

### `backend/tests/test_accounting_service.py`

```python
# backend/tests/test_accounting_service.py

import pytest
from uuid import uuid4
from app.services.accounting_service import (
    resolve_account_for_expense,
    create_accounting_mapping,
    create_chart_of_accounts,
)


def test_resolve_account_no_mapping(db, company):
    """Doit retourner None si pas de mapping."""
    result = resolve_account_for_expense(
        db, company.id, uuid4()
    )
    assert result is None


def test_create_and_resolve_account(db, company, user, expense_category):
    """Doit créer un mapping et le résoudre."""
    # Créer un compte comptable
    account = create_chart_of_accounts(
        db, company.id, "625100", "Déplacements", "expense", user.id
    )
    
    # Créer un mapping
    mapping = create_accounting_mapping(
        db, company.id, expense_category.id, account.id, user.id
    )
    
    # Résoudre
    result = resolve_account_for_expense(
        db, company.id, expense_category.id
    )
    
    assert result.id == account.id
```

---

## Checklist Phase 0

- [ ] Créer les 5 modèles (ChartOfAccounts, AccountingMappings, etc.)
- [ ] Générer migrations Alembic
- [ ] Implémenter les services
- [ ] Créer les endpoints `/accounting`
- [ ] Créer les schemas Pydantic
- [ ] Ajouter au `main.py`
- [ ] Écrire tests unitaires
- [ ] Tester intégration avec V1 (dépenses)
- [ ] Seeder les templates SYSCOHADA
- [ ] Documentation API (Swagger)

