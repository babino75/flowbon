from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class CompanyBase(BaseModel):
    name: str
    country: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    max_users: Optional[int] = None
    currency: Optional[str] = "XOF"
    company_type: Optional[str] = "profit"
    has_separate_cashier: Optional[bool] = False


class CompanyCreateSchema(CompanyBase):
    pass


class CompanyUpdateSchema(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    max_users: Optional[int] = None
    currency: Optional[str] = None
    has_separate_cashier: Optional[bool] = None


class CompanyResponse(CompanyBase):
    id: UUID
    subscription_plan: str
    subscription_status: str
    trial_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
