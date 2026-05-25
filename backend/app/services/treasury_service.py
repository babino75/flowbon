"""Dual-write service for treasury and cash register synchronization.

This service ensures both the legacy CashRegister/CashTransaction system
and the new TreasuryAccount/TreasuryTransaction system are kept in sync
during the transition period.
"""

from uuid import UUID
from decimal import Decimal
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.cash_register import CashRegister, CashTransaction
from app.models.treasury import TreasuryAccount, TreasuryTransaction
from app.models.user import User


def create_expense_transactions(
    db: Session,
    company_id: UUID,
    expense_id: UUID,
    cash_register_id: Optional[UUID],
    treasury_account_id: Optional[UUID],
    amount: Decimal,
    currency: str,
    category_id: Optional[UUID],
    department_id: Optional[UUID],
    project_id: Optional[UUID],
    created_by: UUID,
    description: str = "",
    reference: str = "",
) -> tuple[Optional[CashTransaction], Optional[TreasuryTransaction]]:
    """Create both legacy and new treasury transaction entries for an expense payment.
    
    Returns tuple of (CashTransaction, TreasuryTransaction) - either can be None if not applicable.
    """
    
    cash_tx = None
    treasury_tx = None
    
    # Write to legacy CashRegister system if provided
    if cash_register_id:
        try:
            register = db.query(CashRegister).filter(
                CashRegister.id == cash_register_id,
                CashRegister.company_id == company_id
            ).first()
            
            if register:
                cash_tx = CashTransaction(
                    cash_register_id=cash_register_id,
                    type="EXIT",  # Money going out
                    amount=amount,
                    source="expense",  # Can be generalized or mapped
                    created_by=created_by,
                    description=description or f"Expense payment: {reference}",
                )
                db.add(cash_tx)
                db.flush()  # Get the ID without committing
                
                # Update cash register balance
                register.current_balance -= amount
        except Exception as e:
            print(f"Warning: Failed to write CashTransaction: {e}")
    
    # Write to new TreasuryAccount system if provided
    if treasury_account_id:
        try:
            account = db.query(TreasuryAccount).filter(
                TreasuryAccount.id == treasury_account_id,
                TreasuryAccount.company_id == company_id
            ).first()
            
            if account:
                treasury_tx = TreasuryTransaction(
                    company_id=company_id,
                    treasury_account_id=treasury_account_id,
                    type="OUT",
                    amount=amount,
                    currency=currency,
                    source_type="EXPENSE_PAYMENT",
                    source_id=expense_id,
                    category_id=category_id,
                    linked_expense_id=expense_id,
                    department_id=department_id,
                    project_id=project_id,
                    reference=reference,
                    description=description,
                    status="PENDING",  # May be validated later
                    created_by=created_by,
                )
                db.add(treasury_tx)
                db.flush()
                
                # Update treasury account balance
                account.current_balance -= amount
        except Exception as e:
            print(f"Warning: Failed to write TreasuryTransaction: {e}")
    
    return cash_tx, treasury_tx


def create_advance_payment_transactions(
    db: Session,
    company_id: UUID,
    advance_id: UUID,
    cash_register_id: Optional[UUID],
    treasury_account_id: Optional[UUID],
    amount: Decimal,
    currency: str,
    department_id: Optional[UUID],
    project_id: Optional[UUID],
    created_by: UUID,
    description: str = "",
    reference: str = "",
) -> tuple[Optional[CashTransaction], Optional[TreasuryTransaction]]:
    """Create both legacy and new treasury transaction entries for an advance payment.
    
    Returns tuple of (CashTransaction, TreasuryTransaction).
    """
    
    cash_tx = None
    treasury_tx = None
    
    # Write to legacy CashRegister system if provided
    if cash_register_id:
        try:
            register = db.query(CashRegister).filter(
                CashRegister.id == cash_register_id,
                CashRegister.company_id == company_id
            ).first()
            
            if register:
                cash_tx = CashTransaction(
                    cash_register_id=cash_register_id,
                    type="EXIT",
                    amount=amount,
                    source="advance_payout",
                    created_by=created_by,
                    description=description or f"Advance payment: {reference}",
                )
                db.add(cash_tx)
                db.flush()
                
                register.current_balance -= amount
        except Exception as e:
            print(f"Warning: Failed to write CashTransaction for advance: {e}")
    
    # Write to new TreasuryAccount system if provided
    if treasury_account_id:
        try:
            account = db.query(TreasuryAccount).filter(
                TreasuryAccount.id == treasury_account_id,
                TreasuryAccount.company_id == company_id
            ).first()
            
            if account:
                treasury_tx = TreasuryTransaction(
                    company_id=company_id,
                    treasury_account_id=treasury_account_id,
                    type="OUT",
                    amount=amount,
                    currency=currency,
                    source_type="ADVANCE_PAYMENT",
                    source_id=advance_id,
                    linked_advance_id=advance_id,
                    department_id=department_id,
                    project_id=project_id,
                    reference=reference,
                    description=description,
                    status="PENDING",
                    created_by=created_by,
                )
                db.add(treasury_tx)
                db.flush()
                
                account.current_balance -= amount
        except Exception as e:
            print(f"Warning: Failed to write TreasuryTransaction for advance: {e}")
    
    return cash_tx, treasury_tx


def create_transfer_transaction(
    db: Session,
    company_id: UUID,
    from_treasury_account_id: UUID,
    to_treasury_account_id: UUID,
    amount: Decimal,
    currency: str,
    created_by: UUID,
    description: str = "",
    reference: str = "",
) -> Optional[TreasuryTransaction]:
    """Create a transfer between two treasury accounts (new system only)."""
    
    treasury_tx = None
    
    try:
        from_account = db.query(TreasuryAccount).filter(
            TreasuryAccount.id == from_treasury_account_id,
            TreasuryAccount.company_id == company_id
        ).first()
        
        to_account = db.query(TreasuryAccount).filter(
            TreasuryAccount.id == to_treasury_account_id,
            TreasuryAccount.company_id == company_id
        ).first()
        
        if from_account and to_account and from_account.id != to_account.id:
            treasury_tx = TreasuryTransaction(
                company_id=company_id,
                treasury_account_id=from_treasury_account_id,
                type="TRANSFER",
                amount=amount,
                currency=currency,
                source_type="TRANSFER",
                from_treasury_account_id=from_treasury_account_id,
                to_treasury_account_id=to_treasury_account_id,
                reference=reference,
                description=description,
                status="PENDING",
                created_by=created_by,
            )
            db.add(treasury_tx)
            db.flush()
            
            # Update both account balances
            from_account.current_balance -= amount
            to_account.current_balance += amount
    except Exception as e:
        print(f"Warning: Failed to create transfer transaction: {e}")
    
    return treasury_tx


def refund_expense_transactions(
    db: Session,
    company_id: UUID,
    expense_id: UUID,
    cash_register_id: Optional[UUID],
    treasury_account_id: Optional[UUID],
    amount: Decimal,
    currency: str,
    created_by: UUID,
    description: str = "",
) -> tuple[Optional[CashTransaction], Optional[TreasuryTransaction]]:
    """Create refund transactions for rejected/cancelled expenses."""
    
    cash_tx = None
    treasury_tx = None
    
    # Write to legacy system if provided
    if cash_register_id:
        try:
            register = db.query(CashRegister).filter(
                CashRegister.id == cash_register_id,
                CashRegister.company_id == company_id
            ).first()
            
            if register:
                cash_tx = CashTransaction(
                    cash_register_id=cash_register_id,
                    type="ENTRY",
                    amount=amount,
                    source="refund",
                    created_by=created_by,
                    description=description or f"Expense refund for: {expense_id}",
                )
                db.add(cash_tx)
                db.flush()
                
                register.current_balance += amount
        except Exception as e:
            print(f"Warning: Failed to write refund CashTransaction: {e}")
    
    # Write to new system if provided
    if treasury_account_id:
        try:
            account = db.query(TreasuryAccount).filter(
                TreasuryAccount.id == treasury_account_id,
                TreasuryAccount.company_id == company_id
            ).first()
            
            if account:
                treasury_tx = TreasuryTransaction(
                    company_id=company_id,
                    treasury_account_id=treasury_account_id,
                    type="IN",
                    amount=amount,
                    currency=currency,
                    source_type="REFUND",
                    source_id=expense_id,
                    linked_expense_id=expense_id,
                    description=description,
                    status="PENDING",
                    created_by=created_by,
                )
                db.add(treasury_tx)
                db.flush()
                
                account.current_balance += amount
        except Exception as e:
            print(f"Warning: Failed to write refund TreasuryTransaction: {e}")
    
    return cash_tx, treasury_tx
