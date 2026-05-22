from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, condecimal, Field

from app.schemas.attachment import AttachmentResponse
from app.schemas.user import UserBase


class ExpenseBase(BaseModel):
    amount: condecimal(max_digits=12, decimal_places=2)
    tax_amount: Optional[condecimal(max_digits=12, decimal_places=2)] = Decimal("0.00")
    currency: str = Field(min_length=3, max_length=5)
    description: Optional[str] = None
    expense_date: date


class ExpenseCreateSchema(ExpenseBase):
    category_id: UUID
    department_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    status: str = Field(default="draft")
    advance_id: Optional[UUID] = None


class ExpenseUpdateSchema(BaseModel):
    amount: Optional[condecimal(max_digits=12, decimal_places=2)] = None
    tax_amount: Optional[condecimal(max_digits=12, decimal_places=2)] = None
    currency: Optional[str] = Field(default=None, min_length=3, max_length=5)
    category_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    description: Optional[str] = None
    expense_date: Optional[date] = None
    advance_id: Optional[UUID] = None
    # Phase 4 — Surcharge comptable par le comptable
    accounting_account_id: Optional[UUID] = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    reference_number: str
    company_id: UUID
    user_id: UUID
    department_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    accounting_account_id: Optional[UUID] = None
    category_id: UUID
    category: str
    status: str
    advance_id: Optional[UUID] = None
    rejection_comment: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    attachments: List[AttachmentResponse] = []
    user: Optional[UserBase] = None

    model_config = ConfigDict(from_attributes=True)

