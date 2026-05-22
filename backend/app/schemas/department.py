from uuid import UUID
from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserDepartmentResponse(BaseModel):
    id: UUID
    department_id: UUID
    is_primary: bool
    department: DepartmentResponse

    model_config = ConfigDict(from_attributes=True)
