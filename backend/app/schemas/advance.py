from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, condecimal, Field

from app.schemas.user import UserBase


class AdvanceBase(BaseModel):
    amount: condecimal(max_digits=12, decimal_places=2)
    currency: str = Field(min_length=3, max_length=5)
    description: Optional[str] = None
    category_id: Optional[UUID] = None


class AdvanceCreateSchema(AdvanceBase):
    status: str = Field(default="draft")


class AdvanceUpdateSchema(BaseModel):
    amount: Optional[condecimal(max_digits=12, decimal_places=2)] = None
    currency: Optional[str] = Field(default=None, min_length=3, max_length=5)
    description: Optional[str] = None
    category_id: Optional[UUID] = None


class AdvanceResponse(AdvanceBase):
    id: UUID
    company_id: UUID
    user_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    disbursed_at: Optional[datetime] = None
    reconciled_at: Optional[datetime] = None
    
    user: Optional[UserBase] = None
    
    # Calculated properties
    matched_expenses_sum: Decimal = Decimal("0.00")
    balance: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)
