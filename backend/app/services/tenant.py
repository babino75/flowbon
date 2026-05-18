from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.attachment import Attachment
from app.models.company import Company
from app.models.expense import ExpenseRequest, ExpenseCategory
from app.models.invitation import Invitation
from app.models.user import User


def get_company_for_user(db: Session, current_user: User) -> Optional[Company]:
    if current_user.company_id is None:
        return None
    return db.query(Company).filter(Company.id == current_user.company_id).first()


def list_users_for_company(db: Session, current_user: User):
    query = db.query(User)
    if current_user.role != "super_admin":
        query = query.filter(User.company_id == current_user.company_id)
    return query.all()


def get_user_for_company(db: Session, user_id, current_user: User) -> Optional[User]:
    query = db.query(User).filter(User.id == user_id)
    if current_user.role != "super_admin":
        query = query.filter(User.company_id == current_user.company_id)
    return query.first()


def get_invitation_for_company(db: Session, invitation_id, current_user: User) -> Optional[Invitation]:
    query = db.query(Invitation).filter(Invitation.id == invitation_id)
    if current_user.role != "super_admin":
        query = query.filter(Invitation.company_id == current_user.company_id)
    return query.first()


def list_invitations_for_company(db: Session, current_user: User):
    query = db.query(Invitation)
    if current_user.role != "super_admin":
        query = query.filter(Invitation.company_id == current_user.company_id)
    return query.all()


def get_expense_for_company(db: Session, expense_id, current_user: User) -> Optional[ExpenseRequest]:
    query = db.query(ExpenseRequest).filter(ExpenseRequest.id == expense_id)
    if current_user.role != "super_admin":
        query = query.filter(ExpenseRequest.company_id == current_user.company_id)
    return query.first()


def list_expenses_for_company(db: Session, current_user: User, filters: dict):
    query = db.query(ExpenseRequest).options(joinedload(ExpenseRequest.user))
    if current_user.role != "super_admin":
        query = query.filter(ExpenseRequest.company_id == current_user.company_id)
        if current_user.role == "employee":
            query = query.filter(ExpenseRequest.user_id == current_user.id)

    if filters.get("status"):
        query = query.filter(ExpenseRequest.status == filters["status"])
    if filters.get("category"):
        query = query.join(ExpenseRequest.category_rel).filter(ExpenseCategory.name.ilike(f"%{filters['category']}%"))
    if filters.get("from_date"):
        query = query.filter(ExpenseRequest.expense_date >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(ExpenseRequest.expense_date <= filters["to_date"])

    page = filters.get("page", 1)
    limit = filters.get("limit", 20)
    return query.order_by(ExpenseRequest.created_at.desc()).offset((page - 1) * limit).limit(limit).all()


def get_attachment_for_expense(db: Session, attachment_id, expense: ExpenseRequest) -> Optional[Attachment]:
    return (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id)
        .filter(Attachment.expense_request_id == expense.id)
        .first()
    )


def get_expense_logs_for_company(db: Session, expense: ExpenseRequest):
    from app.models.approval_log import ApprovalLog
    # Requires expense to be verified against the current company beforehand
    return (
        db.query(ApprovalLog)
        .filter(ApprovalLog.expense_request_id == expense.id)
        .order_by(ApprovalLog.created_at.asc())
        .all()
    )


def _apply_dashboard_filters(query, current_user: User, filters: dict):
    if current_user.role != "super_admin":
        query = query.filter(ExpenseRequest.company_id == current_user.company_id)
        if current_user.role == "employee":
            query = query.filter(ExpenseRequest.user_id == current_user.id)

    if filters.get("fiscal_year_id"):
        query = query.filter(ExpenseRequest.fiscal_year_id == filters["fiscal_year_id"])
    else:
        if filters.get("from_date"):
            query = query.filter(ExpenseRequest.expense_date >= filters["from_date"])
        if filters.get("to_date"):
            query = query.filter(ExpenseRequest.expense_date <= filters["to_date"])
        
    if filters.get("category_id"):
        query = query.filter(ExpenseRequest.category_id == filters["category_id"])
    if filters.get("status"):
        query = query.filter(ExpenseRequest.status == filters["status"])
    if filters.get("user_id"):
        query = query.filter(ExpenseRequest.user_id == filters["user_id"])
    
    return query



def get_dashboard_summary(db: Session, current_user: User, filters: dict):
    query = db.query(
        func.sum(ExpenseRequest.amount).label("total_amount"),
        ExpenseRequest.status,
        func.count(ExpenseRequest.id).label("count")
    )
    query = _apply_dashboard_filters(query, current_user, filters)
    results = query.group_by(ExpenseRequest.status).all()

    summary = {
        "total_spent": 0,
        "pending_count": 0,
        "approved_count": 0,
        "paid_count": 0,
        "remaining_to_pay": 0,
    }

    for row in results:
        amount = float(row.total_amount or 0)
        count = row.count
        if row.status == "paid":
            summary["total_spent"] += amount
            summary["paid_count"] += count
        elif row.status == "approved":
            summary["remaining_to_pay"] += amount
            summary["approved_count"] += count
        elif row.status == "pending":
            summary["pending_count"] += count

    total_decisions = summary["approved_count"] + summary["paid_count"] + sum(r.count for r in results if r.status == "rejected")
    summary["approval_rate"] = round((summary["approved_count"] + summary["paid_count"]) / total_decisions * 100) if total_decisions > 0 else 0

    return summary


def get_expenses_by_category(db: Session, current_user: User, filters: dict):
    query = db.query(
        ExpenseCategory.name.label("category"),
        func.sum(ExpenseRequest.amount).label("total")
    ).join(ExpenseRequest.category_rel)
    if not filters.get("status"):
        query = query.filter(ExpenseRequest.status.in_(["approved", "paid"]))
    query = _apply_dashboard_filters(query, current_user, filters)
    results = query.group_by(ExpenseCategory.name).all()
    return [{"category": r.category, "total": float(r.total or 0)} for r in results]


def get_monthly_trend(db: Session, current_user: User, filters: dict):
    query = db.query(
        func.to_char(ExpenseRequest.expense_date, 'YYYY-MM').label("month"),
        func.sum(ExpenseRequest.amount).label("total")
    )
    if not filters.get("status"):
        query = query.filter(ExpenseRequest.status.in_(["approved", "paid"]))
    query = _apply_dashboard_filters(query, current_user, filters)
    results = query.group_by("month").order_by("month").all()
    return [{"month": r.month, "total": float(r.total or 0)} for r in results]


def get_recent_expenses(db: Session, current_user: User, filters: dict, limit: int = 10):
    query = db.query(ExpenseRequest).options(joinedload(ExpenseRequest.user))
    query = _apply_dashboard_filters(query, current_user, filters)
    return query.order_by(ExpenseRequest.created_at.desc()).limit(limit).all()



def seed_default_categories(db: Session, company_id):
    import uuid
    default_names = [
        "Transport", "Hébergement", "Repas", "Fournitures de bureau",
        "Informatique & Logiciels", "Télécom & Internet", "Formation", "Frais divers"
    ]
    for name in default_names:
        cat = ExpenseCategory(
            id=uuid.uuid4(),
            company_id=company_id,
            name=name,
            is_active=True
        )
        db.add(cat)
    db.commit()


def list_categories(db: Session, company_id, only_active: bool = False):
    query = db.query(ExpenseCategory).filter(ExpenseCategory.company_id == company_id)
    if only_active:
        query = query.filter(ExpenseCategory.is_active == True)
    return query.order_by(ExpenseCategory.name.asc()).all()


def create_category(db: Session, company_id, name: str, code: str = None):
    import uuid
    cat = ExpenseCategory(
        id=uuid.uuid4(),
        company_id=company_id,
        name=name,
        code=code,
        is_active=True
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def get_category_by_id(db: Session, category_id, company_id):
    return db.query(ExpenseCategory).filter(
        ExpenseCategory.id == category_id,
        ExpenseCategory.company_id == company_id
    ).first()

