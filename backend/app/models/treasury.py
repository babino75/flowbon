import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Boolean, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class TreasuryAccount(Base):
    """Compte de trésorerie : où l'argent est stocké (banque, caisse, mobile money, etc.)"""
    __tablename__ = "treasury_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    user_label = Column(String(255), nullable=False)  # Libellé visible pour employé
    type = Column(String(50), nullable=False)  # BANK, CASH, MOBILE_MONEY, SAFE, OTHER
    currency = Column(String(3), nullable=False, default="XOF")
    opening_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    current_balance = Column(Numeric(12, 2), default=0.00, nullable=False)  # Cache/dérivé
    accounting_account_id = Column(UUID(as_uuid=True), ForeignKey("accounting_accounts.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company")
    created_by_user = relationship("User", foreign_keys=[created_by])
    accounting_account = relationship("AccountingAccount", foreign_keys=[accounting_account_id])
    transactions = relationship("TreasuryTransaction", back_populates="treasury_account", cascade="all, delete-orphan", foreign_keys="TreasuryTransaction.treasury_account_id")
    outgoing_transfers = relationship("TreasuryTransaction", back_populates="from_account", foreign_keys="TreasuryTransaction.from_treasury_account_id")
    incoming_transfers = relationship("TreasuryTransaction", back_populates="to_account", foreign_keys="TreasuryTransaction.to_treasury_account_id")


class TreasuryTransaction(Base):
    """Transaction de trésorerie : mouvement d'argent (pourquoi l'argent bouge)"""
    __tablename__ = "treasury_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    treasury_account_id = Column(UUID(as_uuid=True), ForeignKey("treasury_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Type de transaction
    type = Column(String(50), nullable=False)  # IN, OUT, TRANSFER, ADJUSTMENT
    
    # Montant
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="XOF")
    
    # Source métier : pourquoi la transaction
    source_type = Column(String(100), nullable=False)  # EXPENSE_PAYMENT, ADVANCE_PAYMENT, DONATION, TRANSFER, REFUND, MANUAL_ADJUSTMENT
    source_id = Column(UUID(as_uuid=True), nullable=True)  # ID de l'entité métier
    
    # Liens métier
    category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id", ondelete="SET NULL"), nullable=True)
    linked_expense_id = Column(UUID(as_uuid=True), ForeignKey("expense_requests.id", ondelete="SET NULL"), nullable=True)
    linked_advance_id = Column(UUID(as_uuid=True), ForeignKey("advance_requests.id", ondelete="SET NULL"), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    
    # Transferts
    from_treasury_account_id = Column(UUID(as_uuid=True), ForeignKey("treasury_accounts.id", ondelete="CASCADE"), nullable=True)
    to_treasury_account_id = Column(UUID(as_uuid=True), ForeignKey("treasury_accounts.id", ondelete="CASCADE"), nullable=True)
    
    # Audit
    reference = Column(String(100), nullable=True, unique=True, index=True)  # REF-2026-0001
    description = Column(String(500), nullable=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, VALIDATED, REJECTED
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    validated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Réconciliation
    is_reconciled = Column(Boolean, default=False, nullable=False)
    external_reference = Column(String(100), nullable=True)  # Numéro chèque, virement, etc.
    accounting_entry_id = Column(UUID(as_uuid=True), nullable=True)  # Futur lien vers écriture comptable
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company")
    treasury_account = relationship("TreasuryAccount", back_populates="transactions", foreign_keys=[treasury_account_id])
    from_account = relationship("TreasuryAccount", back_populates="outgoing_transfers", foreign_keys=[from_treasury_account_id])
    to_account = relationship("TreasuryAccount", back_populates="incoming_transfers", foreign_keys=[to_treasury_account_id])
    category = relationship("ExpenseCategory", foreign_keys=[category_id])
    linked_expense = relationship("ExpenseRequest", foreign_keys=[linked_expense_id])
    linked_advance = relationship("AdvanceRequest", foreign_keys=[linked_advance_id])
    project = relationship("Project", foreign_keys=[project_id])
    department = relationship("Department", foreign_keys=[department_id])
    creator = relationship("User", foreign_keys=[created_by])
    validator = relationship("User", foreign_keys=[validated_by])
