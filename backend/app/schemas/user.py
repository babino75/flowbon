from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "employee"
    is_backup_manager: bool = False
    is_backup_accountant: bool = False


class UserCreate(UserBase):
    password: str = Field(min_length=8, description="Mot de passe d'au moins 8 caracteres")


class UserRoleUpdate(BaseModel):
    role: str
    is_backup_manager: Optional[bool] = None
    is_backup_accountant: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    id: UUID
    company_id: Optional[UUID] = None
    invited_by: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
