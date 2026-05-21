from pydantic import BaseModel
from typing import List

class DashboardSummaryResponse(BaseModel):
    total_spent: float
    pending_count: int
    approved_count: int
    paid_count: int
    remaining_to_pay: float
    approval_rate: int
    rejected_count: int = 0
    total_paid: float = 0.0
    total_approved_accounting: int = 0
    approved_accounting_count: int = 0
    total_disbursed: float = 0.0

class CategoryData(BaseModel):
    category: str
    total: float

class MonthlyTrendData(BaseModel):
    month: str
    total: float
