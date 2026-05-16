from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.attachment import Attachment
from app.models.company import Company
from app.models.expense import ExpenseRequest
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
    query = db.query(ExpenseRequest)
    if current_user.role != "super_admin":
        query = query.filter(ExpenseRequest.company_id == current_user.company_id)

    if filters.get("status"):
        query = query.filter(ExpenseRequest.status == filters["status"])
    if filters.get("category"):
        query = query.filter(ExpenseRequest.category.ilike(f"%{filters['category']}%"))
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
