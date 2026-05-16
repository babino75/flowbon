from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, condecimal, Field

from app.schemas.attachment import AttachmentResponse


class ExpenseBase(BaseModel):
    amount: condecimal(max_digits=12, decimal_places=2)
    currency: str = Field(min_length=3, max_length=5)
    category: str
    description: Optional[str] = None
    expense_date: date


class ExpenseCreateSchema(ExpenseBase):
    status: str = Field(default="draft")


class ExpenseUpdateSchema(BaseModel):
    amount: Optional[condecimal(max_digits=12, decimal_places=2)] = None
    currency: Optional[str] = Field(default=None, min_length=3, max_length=5)
    category: Optional[str] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    company_id: UUID
    user_id: UUID
    status: str
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    attachments: List[AttachmentResponse] = []

    model_config = ConfigDict(from_attributes=True)
