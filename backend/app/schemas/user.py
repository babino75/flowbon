from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


from app.schemas.department import UserDepartmentResponse

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "employee"
    is_backup_manager: bool = False
    is_backup_accountant: bool = False
    is_backup_cashier: bool = False


class UserCreate(UserBase):
    password: str = Field(min_length=8, description="Mot de passe d'au moins 8 caracteres")


class UserRoleUpdate(BaseModel):
    role: str
    scope_type: Optional[str] = None
    scope_id: Optional[UUID] = None
    is_backup_manager: Optional[bool] = None
    is_backup_accountant: Optional[bool] = None
    is_backup_cashier: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    id: UUID
    company_id: Optional[UUID] = None
    invited_by: Optional[UUID] = None
    is_active: bool
    scope_type: str
    scope_id: Optional[UUID] = None
    department_links: list[UserDepartmentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
