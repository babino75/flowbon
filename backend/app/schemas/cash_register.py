from datetime import datetime
from typing import Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field
from typing import List
from app.schemas.user import UserResponse
class CashRegisterBase(BaseModel):
    name: str
    currency: Optional[str] = "XOF"


class CashRegisterCreateSchema(CashRegisterBase):
    cashier_ids: Optional[List[UUID]] = []

class CashRegisterAssignCashiers(BaseModel):
    cashier_ids: List[UUID]


class CashRegisterResponse(CashRegisterBase):
    id: UUID
    company_id: UUID
    current_balance: Decimal
    created_at: datetime
    updated_at: datetime
    cashiers: List[UserResponse] = []

    model_config = ConfigDict(from_attributes=True)


class CashTransactionManualCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Montant de la transaction (doit être > 0)")
    description: Optional[str] = None
    source: Optional[str] = "replenishment"  # Ou "adjustment"
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None


class CashTransactionResponse(BaseModel):
    id: UUID
    cash_register_id: UUID
    type: str  # "ENTRY" or "EXIT"
    amount: Decimal
    source: str
    description: Optional[str] = None
    reference_id: Optional[UUID] = None
    created_by: UUID
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
