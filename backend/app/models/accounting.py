import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AccountingAccount(Base):
    __tablename__ = "accounting_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    mappings = relationship("ExpenseCategoryAccountingMapping", back_populates="account")
    cash_registers = relationship("CashRegister", backref="accounting_account")
    ledger_entries = relationship("LedgerEntry", back_populates="account")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_accounting_account_company_code"),
    )


class ExpenseCategoryAccountingMapping(Base):
    __tablename__ = "expense_category_account_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    expense_category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id"), nullable=False, index=True)
    accounting_account_id = Column(UUID(as_uuid=True), ForeignKey("accounting_accounts.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    category = relationship("ExpenseCategory", back_populates="accounting_mapping")
    account = relationship("AccountingAccount", back_populates="mappings")

    __table_args__ = (
        UniqueConstraint("company_id", "expense_category_id", name="uq_category_account_mapping"),
    )


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    reference_number = Column(String, nullable=True, index=True)  # Ex: LED-2026-0200
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    accounting_account_id = Column(UUID(as_uuid=True), ForeignKey("accounting_accounts.id"), nullable=False, index=True)
    
    reference_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Links to Expense, CashTransaction, etc.
    reference_type = Column(String, nullable=False)  # "EXPENSE_PAYMENT", "CASH_ENTRY", etc.
    
    description = Column(String, nullable=True)
    
    from sqlalchemy import Numeric
    debit = Column(Numeric(12, 2), default=0.00, nullable=False)
    credit = Column(Numeric(12, 2), default=0.00, nullable=False)
    
    transaction_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    account = relationship("AccountingAccount", back_populates="ledger_entries")
