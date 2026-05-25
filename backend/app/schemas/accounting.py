from uuid import UUID
from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class AccountingAccountBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class AccountingAccountCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class AccountingAccountUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AccountingAccountResponse(AccountingAccountBase):
    id: UUID
    company_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryAccountMappingCreate(BaseModel):
    accounting_account_id: UUID


class CategoryAccountMappingResponse(BaseModel):
    id: UUID
    company_id: UUID
    expense_category_id: UUID
    accounting_account_id: UUID
    accounting_account: Optional[AccountingAccountResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LedgerEntryResponse(BaseModel):
    id: UUID
    reference_number: Optional[str] = None
    company_id: UUID
    accounting_account_id: UUID
    fiscal_year_id: Optional[UUID] = None
    journal_type: Optional[str] = None
    piece_number: Optional[str] = None
    reference_id: Optional[UUID] = None
    reference_type: str
    description: Optional[str] = None
    debit: float
    credit: float
    transaction_date: datetime
    created_at: datetime
    account: Optional[AccountingAccountResponse] = None

    model_config = ConfigDict(from_attributes=True)


class AccountingPlanCreate(BaseModel):
    account_code: str
    account_name: str
    category_name: str
    category_description: Optional[str] = None
    account_type: Optional[str] = "expense"


class AccountingPlanItemResponse(BaseModel):
    account_id: UUID
    account_code: str
    account_name: str
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
