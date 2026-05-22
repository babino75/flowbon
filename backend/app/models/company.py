import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    
    # Subscription management (SaaS mode vs Self-hosted)
    subscription_plan = Column(String, default="free", nullable=False)
    subscription_status = Column(String, default="pending_selection", nullable=False)
    company_type = Column(String, default="profit", nullable=False)
    max_users = Column(Integer, default=10, nullable=False)
    currency = Column(String, default="XOF", nullable=False)
    trial_expires_at = Column(DateTime, nullable=True)
    has_separate_cashier = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    users = relationship("User", back_populates="company")
    invitations = relationship("Invitation", back_populates="company")
    projects = relationship("Project", back_populates="company")
