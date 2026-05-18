import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ExpenseStatus(str, Enum):
    draft = "draft"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    paid = "paid"
    cancelled = "cancelled"


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company")


class ExpenseRequest(Base):
    __tablename__ = "expense_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), nullable=True, default=0.0)
    currency = Column(String, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id"), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default=ExpenseStatus.draft.value, nullable=False)
    expense_date = Column(Date, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    advance_id = Column(UUID(as_uuid=True), ForeignKey("advance_requests.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    attachments = relationship("Attachment", back_populates="expense", cascade="all, delete-orphan")
    approval_logs = relationship("ApprovalLog", back_populates="expense", cascade="all, delete-orphan", order_by="ApprovalLog.created_at")
    user = relationship("User")
    category_rel = relationship("ExpenseCategory")
    advance = relationship("AdvanceRequest", back_populates="expenses")

    @property
    def category(self):
        return self.category_rel.name if self.category_rel else ""
