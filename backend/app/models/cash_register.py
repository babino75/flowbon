import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Numeric, Table, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

# Account types for treasury accounts
TREASURY_ACCOUNT_TYPES = ["CASH", "BANK", "MOBILE_MONEY", "WALLET"]

cashier_caisse_association = Table(
    "cashier_caisse_association",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("cash_register_id", UUID(as_uuid=True), ForeignKey("cash_registers.id", ondelete="CASCADE"), primary_key=True)
)


class CashRegister(Base):
    __tablename__ = "cash_registers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    currency = Column(String, default="XOF", nullable=False)
    current_balance = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Phase 2 — Trésorerie évolutive
    account_type = Column(String, default="CASH", nullable=False)   # CASH, BANK, MOBILE_MONEY, WALLET
    bank_name = Column(String, nullable=True)        # Ex: "BICIS", "Ecobank", "Wave"
    account_number = Column(String, nullable=True)   # IBAN, numéro de compte ou numéro de téléphone
    is_active = Column(Boolean, default=True, nullable=False)

    # Phase 3 — Liaison avec la comptabilité
    accounting_account_id = Column(UUID(as_uuid=True), ForeignKey("accounting_accounts.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    company = relationship("Company")
    transactions = relationship("CashTransaction", back_populates="cash_register", cascade="all, delete-orphan")
    cashiers = relationship("User", secondary=cashier_caisse_association, backref="assigned_cash_registers")


class CashTransaction(Base):
    __tablename__ = "cash_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    reference_number = Column(String, nullable=True, unique=True, index=True)  # Ex: PAY-2026-0099
    cash_register_id = Column(UUID(as_uuid=True), ForeignKey("cash_registers.id"), nullable=False)
    
    type = Column(String, nullable=False)  # "ENTRY" or "EXIT"
    amount = Column(Numeric(12, 2), nullable=False)
    source = Column(String, nullable=False)  # "replenishment", "refund", "expense", "advance_payout", "adjustment"
    description = Column(String, nullable=True)
    
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # Links to Expense ID or Advance ID
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    attachment_url = Column(String, nullable=True)
    attachment_name = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    cash_register = relationship("CashRegister", back_populates="transactions")
    creator = relationship("User")
