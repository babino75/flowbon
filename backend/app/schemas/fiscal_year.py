from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class FiscalYearCreate(BaseModel):
    label: str
    start_date: date
    end_date: date


class FiscalYearResponse(BaseModel):
    id: UUID
    company_id: UUID
    label: str
    start_date: date
    end_date: date
    status: str
    closed_at: Optional[datetime] = None
    closed_by_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    # Computed stats (populated by service)
    total_expenses: Optional[int] = 0
    total_paid: Optional[float] = 0.0
    total_approved: Optional[float] = 0.0
    pending_count: Optional[int] = 0

    class Config:
        from_attributes = True
