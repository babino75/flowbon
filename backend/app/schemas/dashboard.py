from pydantic import BaseModel
from typing import List

class DashboardSummaryResponse(BaseModel):
    total_spent: float
    pending_count: int
    approved_count: int
    paid_count: int
    remaining_to_pay: float
    approval_rate: int

class CategoryData(BaseModel):
    category: str
    total: float

class MonthlyTrendData(BaseModel):
    month: str
    total: float
