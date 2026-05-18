from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse, CategoryData, MonthlyTrendData
from app.schemas.expense import ExpenseResponse
from app.services.tenant import (
    get_dashboard_summary,
    get_expenses_by_category,
    get_monthly_trend,
    get_recent_expenses,
)

from uuid import UUID

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_filters(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    category_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
):
    return {
        "from_date": from_date,
        "to_date": to_date,
        "category_id": category_id,
        "status": status,
        "user_id": user_id,
    }


@router.get("/summary", response_model=DashboardSummaryResponse)
def summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    filters: dict = Depends(get_filters),
):
    return get_dashboard_summary(db, current_user, filters)


@router.get("/by-category", response_model=List[CategoryData])
def by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    filters: dict = Depends(get_filters),
):
    return get_expenses_by_category(db, current_user, filters)


@router.get("/monthly-trend", response_model=List[MonthlyTrendData])
def monthly_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    filters: dict = Depends(get_filters),
):
    return get_monthly_trend(db, current_user, filters)


@router.get("/recent-expenses", response_model=List[ExpenseResponse])
def recent_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    status: Optional[str] = Query(None),
):
    return get_recent_expenses(db, current_user, status=status)
