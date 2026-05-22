import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="employee", nullable=False)
    
    # Scopes explicites (GLOBAL, DEPARTMENT, TREASURY, PROJECT)
    scope_type = Column(String, default="GLOBAL", nullable=False)
    scope_id = Column(UUID(as_uuid=True), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_backup_manager = Column(Boolean, default=False, nullable=False)
    is_backup_accountant = Column(Boolean, default=False, nullable=False)
    is_backup_cashier = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    company = relationship("Company", back_populates="users")
    department_links = relationship("UserDepartment", back_populates="user", cascade="all, delete-orphan")
    invitations_sent = relationship("Invitation", back_populates="invited_by")
    company_links = relationship("UserCompany", back_populates="user", cascade="all, delete-orphan")


class UserCompany(Base):
    __tablename__ = "user_companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)
    role = Column(String, default="employee", nullable=False)
    
    # Scopes explicites (GLOBAL, DEPARTMENT, TREASURY, PROJECT) par entreprise
    scope_type = Column(String, default="GLOBAL", nullable=False)
    scope_id = Column(UUID(as_uuid=True), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="company_links")
    company = relationship("Company")

    from sqlalchemy import UniqueConstraint
    __table_args__ = (
        UniqueConstraint('user_id', 'company_id', name='uq_user_company'),
    )

