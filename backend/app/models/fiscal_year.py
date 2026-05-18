import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Date, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class FiscalYear(Base):
    __tablename__ = "fiscal_years"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    label = Column(String, nullable=False)  # ex: "2025", "Exercice 2025-2026"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, default="open", nullable=False)  # "open" | "closed"
    closed_at = Column(DateTime, nullable=True)
    closed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company")
    closed_by = relationship("User", foreign_keys=[closed_by_id])
    expenses = relationship("ExpenseRequest", back_populates="fiscal_year")
