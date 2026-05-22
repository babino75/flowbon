import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AdvanceStatus(str, Enum):
    draft = "draft"
    pending = "pending"       # Waiting for manager's approval
    approved = "approved"     # Approved by manager, waiting for accountant's validation
    approved_accounting = "approved_accounting" # Approved by accountant, waiting for cashier's disbursement
    disbursed = "disbursed"   # Cashier disbursed cash, active/in use by employee
    rejected = "rejected"     # Rejected by manager or accountant
    reconciled = "reconciled"# All receipts submitted and change returned, closed.


class AdvanceRequest(Base):
    __tablename__ = "advance_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    reference_number = Column(String, nullable=True, unique=True, index=True)  # Ex: ADV-2026-0012
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default=AdvanceStatus.draft.value, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    disbursed_at = Column(DateTime, nullable=True)
    reconciled_at = Column(DateTime, nullable=True)

    user = relationship("User")
    company = relationship("Company")
    expenses = relationship("ExpenseRequest", back_populates="advance")
    category_rel = relationship("ExpenseCategory")
