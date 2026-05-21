from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class CashSourceBase(BaseModel):
    name: str
    type: str = "ENTRY"  # "ENTRY", "EXIT", or "BOTH"


class CashSourceCreate(CashSourceBase):
    pass


class CashSourceResponse(CashSourceBase):
    id: UUID
    company_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
