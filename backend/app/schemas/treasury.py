from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ─── Treasury Account Schemas ─────────────────────────────────────────────────

class TreasuryAccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    user_label: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., pattern="^(BANK|CASH|MOBILE_MONEY|SAFE|OTHER)$")
    currency: str = Field(default="XOF", min_length=3, max_length=3)
    opening_balance: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0)
    accounting_account_id: Optional[str] = None


class TreasuryAccountCreate(TreasuryAccountBase):
    """Create a new treasury account."""
    pass


class TreasuryAccountUpdate(BaseModel):
    """Update treasury account."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    user_label: Optional[str] = Field(None, min_length=1, max_length=255)
    accounting_account_id: Optional[str] = None
    is_active: Optional[bool] = None


class TreasuryAccountResponse(TreasuryAccountBase):
    """Response model for treasury account."""
    id: UUID
    company_id: UUID
    current_balance: Decimal
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Treasury Transaction Schemas ────────────────────────────────────────────

class TreasuryTransactionBase(BaseModel):
    type: str = Field(..., pattern="^(IN|OUT|TRANSFER|ADJUSTMENT)$")
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="XOF", min_length=3, max_length=3)
    source_type: str = Field(..., pattern="^(EXPENSE_PAYMENT|ADVANCE_PAYMENT|DONATION|TRANSFER|REFUND|MANUAL_ADJUSTMENT)$")
    source_id: Optional[UUID] = None
    description: Optional[str] = Field(None, max_length=500)


class TreasuryTransactionCreate(TreasuryTransactionBase):
    """Create a new treasury transaction."""
    treasury_account_id: str
    category_id: Optional[str] = None
    linked_expense_id: Optional[str] = None
    linked_advance_id: Optional[str] = None
    project_id: Optional[str] = None
    department_id: Optional[str] = None
    from_treasury_account_id: Optional[str] = None
    to_treasury_account_id: Optional[str] = None
    reference: Optional[str] = Field(None, max_length=100)
    external_reference: Optional[str] = Field(None, max_length=100)


class TreasuryTransactionUpdate(BaseModel):
    """Update treasury transaction (limited fields for audit)."""
    description: Optional[str] = Field(None, max_length=500)
    is_reconciled: Optional[bool] = None
    external_reference: Optional[str] = Field(None, max_length=100)


class TreasuryTransactionValidate(BaseModel):
    """Validate/reject a treasury transaction."""
    status: str = Field(..., pattern="^(VALIDATED|REJECTED)$")
    description: Optional[str] = Field(None, max_length=500)


class TreasuryTransactionResponse(TreasuryTransactionBase):
    """Response model for treasury transaction."""
    id: UUID
    company_id: UUID
    treasury_account_id: UUID
    category_id: Optional[UUID]
    linked_expense_id: Optional[UUID]
    linked_advance_id: Optional[UUID]
    project_id: Optional[UUID]
    department_id: Optional[UUID]
    from_treasury_account_id: Optional[UUID]
    to_treasury_account_id: Optional[UUID]
    reference: Optional[str]
    status: str
    created_by: UUID
    validated_by: Optional[UUID]
    is_reconciled: bool
    external_reference: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TreasuryTransactionListResponse(BaseModel):
    """Simplified response for transaction lists."""
    id: UUID
    reference: Optional[str]
    type: str
    source_type: str
    amount: Decimal
    currency: str
    treasury_account_id: UUID
    status: str
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True
