"""Treasury management routes."""
import uuid as uuid_lib
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.core.dependencies import get_current_active_user, get_db
from app.models.treasury import TreasuryAccount, TreasuryTransaction
from app.models.user import User
from app.schemas.treasury import (
    TreasuryAccountCreate,
    TreasuryAccountResponse,
    TreasuryAccountUpdate,
    TreasuryTransactionCreate,
    TreasuryTransactionResponse,
    TreasuryTransactionUpdate,
    TreasuryTransactionValidate,
    TreasuryTransactionListResponse,
)

router = APIRouter(prefix="/treasury", tags=["treasury"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _require_finance_role(user: User):
    if user.role not in ["admin", "super_admin", "accountant"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et comptables.")

def _generate_reference(db: Session, company_id) -> str:
    year = date.today().year
    prefix = f"TRX-{year}-"
    count = db.query(func.count(TreasuryTransaction.id)).filter(
        TreasuryTransaction.company_id == company_id,
        TreasuryTransaction.reference.like(f"{prefix}%")
    ).scalar() or 0
    return f"{prefix}{str(count + 1).zfill(5)}"

def _update_balance(db: Session, transaction: TreasuryTransaction):
    """Update account balance(s) when a transaction is validated."""
    amount = float(transaction.amount)
    account = db.query(TreasuryAccount).filter(TreasuryAccount.id == transaction.treasury_account_id).first()
    if not account:
        return

    if transaction.type == "IN":
        account.current_balance = float(account.current_balance) + amount
    elif transaction.type == "OUT":
        account.current_balance = float(account.current_balance) - amount
    elif transaction.type == "ADJUSTMENT":
        account.current_balance = float(account.current_balance) + amount  # positive or negative
    elif transaction.type == "TRANSFER":
        from_acc = db.query(TreasuryAccount).filter(TreasuryAccount.id == transaction.from_treasury_account_id).first()
        to_acc = db.query(TreasuryAccount).filter(TreasuryAccount.id == transaction.to_treasury_account_id).first()
        if from_acc:
            from_acc.current_balance = float(from_acc.current_balance) - amount
        if to_acc:
            to_acc.current_balance = float(to_acc.current_balance) + amount


# ─── Treasury Account Routes ──────────────────────────────────────────────────

@router.get("/accounts", response_model=list[TreasuryAccountResponse])
def list_treasury_accounts(
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all treasury accounts for the current user's company."""
    filters = [TreasuryAccount.company_id == current_user.company_id]
    if is_active is not None:
        filters.append(TreasuryAccount.is_active == is_active)
        
    if current_user.role == "cashier":
        if current_user.scope_type == "TREASURY" and current_user.scope_id:
            filters.append(TreasuryAccount.id == current_user.scope_id)
        else:
            return []

    return db.query(TreasuryAccount).filter(and_(*filters)).order_by(TreasuryAccount.name).offset(skip).limit(limit).all()


@router.post("/accounts", response_model=TreasuryAccountResponse)
def create_treasury_account(
    account_data: TreasuryAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new treasury account. Restricted to admin/accountant."""
    _require_finance_role(current_user)

    existing = db.query(TreasuryAccount).filter(
        TreasuryAccount.company_id == current_user.company_id,
        TreasuryAccount.name == account_data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un compte avec ce nom existe déjà.")

    account = TreasuryAccount(
        company_id=current_user.company_id,
        name=account_data.name,
        user_label=account_data.user_label,
        type=account_data.type,
        currency=account_data.currency,
        opening_balance=account_data.opening_balance,
        current_balance=account_data.opening_balance,
        accounting_account_id=account_data.accounting_account_id,
        created_by=current_user.id,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/accounts/{account_id}", response_model=TreasuryAccountResponse)
def get_treasury_account(
    account_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    account = db.query(TreasuryAccount).filter(TreasuryAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    if account.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")
    return account


@router.patch("/accounts/{account_id}", response_model=TreasuryAccountResponse)
def update_treasury_account(
    account_id: UUID,
    account_data: TreasuryAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_finance_role(current_user)
    account = db.query(TreasuryAccount).filter(TreasuryAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    if account.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")

    for field, value in account_data.model_dump(exclude_none=True).items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)
    return account


# ─── Treasury Transaction Routes ──────────────────────────────────────────────

@router.get("/transactions", response_model=list[TreasuryTransactionListResponse])
def list_treasury_transactions(
    account_id: Optional[UUID] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    filters = [TreasuryTransaction.company_id == current_user.company_id]

    if account_id:
        filters.append(TreasuryTransaction.treasury_account_id == account_id)
    if type:
        filters.append(TreasuryTransaction.type == type)
    if status:
        filters.append(TreasuryTransaction.status == status)
    if from_date:
        filters.append(TreasuryTransaction.created_at >= from_date)
    if to_date:
        filters.append(TreasuryTransaction.created_at <= to_date)
        
    if current_user.role == "cashier":
        if current_user.scope_type == "TREASURY" and current_user.scope_id:
            filters.append(TreasuryTransaction.treasury_account_id == current_user.scope_id)
        else:
            return []

    return (
        db.query(TreasuryTransaction)
        .filter(and_(*filters))
        .order_by(TreasuryTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/transactions", response_model=TreasuryTransactionResponse)
def create_treasury_transaction(
    transaction_data: TreasuryTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new treasury transaction. Restricted to admin/accountant/cashier."""
    if current_user.role not in ["admin", "super_admin", "accountant", "cashier"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs, comptables et caissiers.")

    # Verify account belongs to company
    account = db.query(TreasuryAccount).filter(
        TreasuryAccount.id == transaction_data.treasury_account_id,
        TreasuryAccount.company_id == current_user.company_id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte de trésorerie introuvable.")
        
    if current_user.role == "cashier":
        if current_user.scope_type != "TREASURY" or str(current_user.scope_id) != str(account.id):
            raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à créer des transactions sur ce compte.")
    if not account.is_active:
        raise HTTPException(status_code=400, detail="Ce compte est désactivé.")

    # Validate TRANSFER
    if transaction_data.type == "TRANSFER":
        if not transaction_data.from_treasury_account_id or not transaction_data.to_treasury_account_id:
            raise HTTPException(status_code=400, detail="Un transfert nécessite un compte source et destination.")
        if transaction_data.from_treasury_account_id == transaction_data.to_treasury_account_id:
            raise HTTPException(status_code=400, detail="Le compte source et destination doivent être différents.")
        from_acc = db.query(TreasuryAccount).filter(
            TreasuryAccount.id == transaction_data.from_treasury_account_id,
            TreasuryAccount.company_id == current_user.company_id
        ).first()
        to_acc = db.query(TreasuryAccount).filter(
            TreasuryAccount.id == transaction_data.to_treasury_account_id,
            TreasuryAccount.company_id == current_user.company_id
        ).first()
        if not from_acc or not to_acc:
            raise HTTPException(status_code=404, detail="Compte source ou destination introuvable.")

    # Auto-generate reference if not provided
    reference = transaction_data.reference or _generate_reference(db, current_user.company_id)

    transaction = TreasuryTransaction(
        company_id=current_user.company_id,
        treasury_account_id=transaction_data.treasury_account_id,
        type=transaction_data.type,
        amount=transaction_data.amount,
        currency=transaction_data.currency,
        source_type=transaction_data.source_type,
        source_id=transaction_data.source_id,
        category_id=transaction_data.category_id,
        linked_expense_id=transaction_data.linked_expense_id,
        linked_advance_id=transaction_data.linked_advance_id,
        project_id=transaction_data.project_id,
        department_id=transaction_data.department_id,
        from_treasury_account_id=transaction_data.from_treasury_account_id,
        to_treasury_account_id=transaction_data.to_treasury_account_id,
        reference=reference,
        description=transaction_data.description,
        external_reference=transaction_data.external_reference,
        created_by=current_user.id,
        status="PENDING",
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/transactions/{transaction_id}", response_model=TreasuryTransactionResponse)
def get_treasury_transaction(
    transaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    transaction = db.query(TreasuryTransaction).filter(TreasuryTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction introuvable.")
    if transaction.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")
    return transaction


@router.patch("/transactions/{transaction_id}", response_model=TreasuryTransactionResponse)
def update_treasury_transaction(
    transaction_id: UUID,
    transaction_data: TreasuryTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_finance_role(current_user)
    transaction = db.query(TreasuryTransaction).filter(TreasuryTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction introuvable.")
    if transaction.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")
    if transaction.status == "VALIDATED":
        raise HTTPException(status_code=400, detail="Impossible de modifier une transaction validée.")

    for field, value in transaction_data.model_dump(exclude_none=True).items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return transaction


@router.post("/transactions/{transaction_id}/validate", response_model=TreasuryTransactionResponse)
def validate_treasury_transaction(
    transaction_id: UUID,
    validation_data: TreasuryTransactionValidate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Validate or reject a treasury transaction. Updates account balance on validation."""
    _require_finance_role(current_user)
    transaction = db.query(TreasuryTransaction).filter(TreasuryTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction introuvable.")
    if transaction.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Accès refusé.")
    if transaction.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Cette transaction est déjà {transaction.status}.")

    transaction.status = validation_data.status
    transaction.validated_by = current_user.id
    if validation_data.description:
        transaction.description = validation_data.description

    # Update balance only on validation
    if validation_data.status == "VALIDATED":
        _update_balance(db, transaction)

    db.commit()
    db.refresh(transaction)
    return transaction
