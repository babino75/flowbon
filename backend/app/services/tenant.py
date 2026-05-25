from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.attachment import Attachment
from app.models.company import Company
from app.models.expense import ExpenseRequest, ExpenseCategory
from app.models.invitation import Invitation
from app.models.user import User
from app.models.advance import AdvanceRequest
from app.models.accounting import LedgerEntry, AccountingAccount
from app.models.cash_register import CashTransaction, CashRegister
from app.models.project import Project
from app.models.department import Department
from app.models.approval_log import ApprovalLog


def get_company_for_user(db: Session, current_user: User) -> Optional[Company]:
    if current_user.company_id is None:
        return None
    return db.query(Company).filter(Company.id == current_user.company_id).first()


def list_users_for_company(db: Session, current_user: User):
    """Always filter by company_id — even super_admin only sees their own company here.
    The global cross-company view is reserved for /super-admin console endpoints."""
    query = db.query(User)
    if current_user.company_id:
        query = query.filter(User.company_id == current_user.company_id)
        
    # Filtrage pour le manager et le comptable: ne voir que leur équipe (même département)
    if current_user.role in ["manager", "accountant"]:
        from app.models.department import UserDepartment
        
        # On récupère tous les départements (primaires ou non) du manager/comptable
        user_depts = db.query(UserDepartment.department_id).filter(
            UserDepartment.user_id == current_user.id
        ).all()
        dept_ids = [d.department_id for d in user_depts]
        
        if dept_ids:
            # Ne récupérer que les utilisateurs qui sont liés à ces mêmes départements
            query = query.join(UserDepartment, User.id == UserDepartment.user_id).filter(
                UserDepartment.department_id.in_(dept_ids)
            )

    return query.all()


def get_user_for_company(db: Session, user_id, current_user: User) -> Optional[User]:
    """Always restrict to the caller's own company — no cross-company user lookup."""
    query = db.query(User).filter(User.id == user_id)
    if current_user.company_id:
        query = query.filter(User.company_id == current_user.company_id)
    return query.first()


def get_invitation_for_company(db: Session, invitation_id, current_user: User) -> Optional[Invitation]:
    """Always restrict to caller's own company."""
    query = db.query(Invitation).filter(Invitation.id == invitation_id)
    if current_user.company_id:
        query = query.filter(Invitation.company_id == current_user.company_id)
    return query.first()


def list_invitations_for_company(db: Session, current_user: User):
    """Always restrict to caller's own company."""
    query = db.query(Invitation)
    if current_user.company_id:
        query = query.filter(Invitation.company_id == current_user.company_id)
    return query.all()


def get_expense_for_company(db: Session, expense_id, current_user: User) -> Optional[ExpenseRequest]:
    """Always restrict to caller's own company — no cross-company expense access."""
    query = db.query(ExpenseRequest).filter(ExpenseRequest.id == expense_id)
    if current_user.company_id:
        query = query.filter(ExpenseRequest.company_id == current_user.company_id)
    return query.first()


def list_expenses_for_company(db: Session, current_user: User, filters: dict):
    """Always restrict to caller's own company. Employees only see their own.
    Cross-company visibility is only available in /super-admin console."""
    query = db.query(ExpenseRequest).options(joinedload(ExpenseRequest.user))
    if current_user.company_id:
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
    if filters.get("project_id"):
        query = query.filter(ExpenseRequest.project_id == filters["project_id"])
    if filters.get("department_id"):
        query = query.filter(ExpenseRequest.department_id == filters["department_id"])

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
    """Apply company-level isolation for dashboard aggregations.
    Every role — including super_admin — is scoped to their own company here.
    The global /super-admin console has its own separate, unfiltered queries."""
    if current_user.company_id:
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
        "approved_accounting_count": 0,
        "paid_count": 0,
        "remaining_to_pay": 0,
        "rejected_count": 0,
        "total_paid": 0,
        "total_approved_accounting": 0,
        "total_disbursed": 0,
    }

    for row in results:
        amount = float(row.total_amount or 0)
        count = row.count
        if row.status == "paid":
            summary["total_spent"] += amount
            summary["paid_count"] += count
            summary["total_paid"] += amount
        elif row.status == "approved":
            summary["remaining_to_pay"] += amount
            summary["approved_count"] += count
        elif row.status == "approved_accounting":
            summary["remaining_to_pay"] += amount
            summary["approved_accounting_count"] += count
            summary["total_approved_accounting"] += count
        elif row.status == "pending":
            summary["pending_count"] += count
        elif row.status == "rejected":
            summary["rejected_count"] += count

    # Count of active (disbursed) advances — always scoped to caller's own company
    adv_query = db.query(func.count(AdvanceRequest.id)).filter(AdvanceRequest.status == "disbursed")
    if current_user.company_id:
        adv_query = adv_query.filter(AdvanceRequest.company_id == current_user.company_id)
    summary["total_disbursed"] = adv_query.scalar() or 0

    total_decisions = summary["approved_count"] + summary["approved_accounting_count"] + summary["paid_count"] + summary["rejected_count"]
    summary["approval_rate"] = round((summary["approved_count"] + summary["approved_accounting_count"] + summary["paid_count"]) / total_decisions * 100) if total_decisions > 0 else 0

    return summary


def get_expenses_by_category(db: Session, current_user: User, filters: dict):
    query = db.query(
        ExpenseCategory.name.label("category"),
        func.sum(ExpenseRequest.amount).label("total")
    ).join(ExpenseRequest.category_rel)
    query = _apply_dashboard_filters(query, current_user, filters)
    results = query.group_by(ExpenseCategory.name).all()
    return [{"category": r.category, "total": float(r.total or 0)} for r in results]


def get_monthly_trend(db: Session, current_user: User, filters: dict):
    query = db.query(
        func.to_char(ExpenseRequest.expense_date, 'YYYY-MM').label("month"),
        func.sum(ExpenseRequest.amount).label("total")
    )
    query = _apply_dashboard_filters(query, current_user, filters)
    results = query.group_by("month").order_by("month").all()
    return [{"month": r.month, "total": float(r.total or 0)} for r in results]


def get_recent_expenses(db: Session, current_user: User, filters: dict, limit: int = 10):
    query = db.query(ExpenseRequest).options(joinedload(ExpenseRequest.user))
    query = _apply_dashboard_filters(query, current_user, filters)
    return query.order_by(ExpenseRequest.created_at.desc()).limit(limit).all()



def seed_default_categories(db: Session, company_id, company_type: str = "profit"):
    import uuid
    
    if company_type == "non_profit":
        categories = [
            {"name": "Achats liés aux projets", "code": "601"},
            {"name": "Fournitures de fonctionnement", "code": "605"},
            {"name": "Indemnités de mission terrain", "code": "613"},
            {"name": "Frais de sensibilisation & ateliers", "code": "621"},
            {"name": "Déplacements & Hébergement", "code": "625"},
            {"name": "Frais de télécommunications", "code": "628"},
            {"name": "Frais bancaires", "code": "63"},
            {"name": "Autres charges diverses", "code": "658"}
        ]
    else:
        categories = [
            {"name": "Fournitures de bureau", "code": "605"},
            {"name": "Transports & Déplacements", "code": "612"},
            {"name": "Locations", "code": "622"},
            {"name": "Entretien & Réparations", "code": "624"},
            {"name": "Frais de télécommunications", "code": "628"},
            {"name": "Services Bancaires", "code": "631"},
            {"name": "Primes d'assurance", "code": "646"},
            {"name": "Frais de réception & Repas", "code": "654"},
            {"name": "Frais divers", "code": "658"}
        ]
        
    for cat_data in categories:
        cat = ExpenseCategory(
            id=uuid.uuid4(),
            company_id=company_id,
            name=cat_data["name"],
            code=cat_data["code"],
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


def list_accounting_accounts(db: Session, company_id, only_active: bool = False):
    from app.models.accounting import AccountingAccount

    query = db.query(AccountingAccount).filter(AccountingAccount.company_id == company_id)
    if only_active:
        query = query.filter(AccountingAccount.is_active == True)
    return query.order_by(AccountingAccount.code.asc()).all()


def create_accounting_account(db: Session, company_id, code: str, name: str, description: str = None):
    import uuid
    from app.models.accounting import AccountingAccount

    account = AccountingAccount(
        id=uuid.uuid4(),
        company_id=company_id,
        code=code,
        name=name,
        description=description,
        is_active=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def get_accounting_account_by_id(db: Session, account_id, company_id):
    from app.models.accounting import AccountingAccount

    return db.query(AccountingAccount).filter(
        AccountingAccount.id == account_id,
        AccountingAccount.company_id == company_id
    ).first()


def get_category_account_mapping(db: Session, category_id, company_id):
    from app.models.accounting import ExpenseCategoryAccountingMapping

    return db.query(ExpenseCategoryAccountingMapping).filter(
        ExpenseCategoryAccountingMapping.expense_category_id == category_id,
        ExpenseCategoryAccountingMapping.company_id == company_id,
    ).first()


def set_category_account_mapping(db: Session, category_id, accounting_account_id, company_id):
    import uuid
    from app.models.accounting import ExpenseCategoryAccountingMapping

    mapping = get_category_account_mapping(db, category_id, company_id)
    if mapping:
        mapping.accounting_account_id = accounting_account_id
    else:
        mapping = ExpenseCategoryAccountingMapping(
            id=uuid.uuid4(),
            company_id=company_id,
            expense_category_id=category_id,
            accounting_account_id=accounting_account_id,
        )
        db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


def delete_category_account_mapping(db: Session, category_id, company_id):
    from app.models.accounting import ExpenseCategoryAccountingMapping

    mapping = get_category_account_mapping(db, category_id, company_id)
    if mapping:
        db.delete(mapping)
        db.commit()
    return None


def list_departments(db: Session, company_id):
    from app.models.department import Department

    return db.query(Department).filter(Department.company_id == company_id).order_by(Department.name.asc()).all()


def create_department(db: Session, company_id, name: str, description: str = None):
    import uuid
    from app.models.department import Department

    dept = Department(
        id=uuid.uuid4(),
        company_id=company_id,
        name=name,
        description=description,
        is_active=True,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def get_department_by_id(db: Session, dept_id, company_id):
    from app.models.department import Department

    return db.query(Department).filter(
        Department.id == dept_id,
        Department.company_id == company_id
    ).first()


def update_department_service(db: Session, dept, update_data: dict):
    for field, value in update_data.items():
        setattr(dept, field, value)
    db.commit()
    db.refresh(dept)
    return dept


def delete_department_service(db: Session, dept):
    db.delete(dept)
    db.commit()


def list_ledger_entries_for_company(db: Session, current_user: User, filters: dict):
    """Retrieve ledger entries for the current user's company.
    Always restrict to company_id for multi-tenant safety."""
    query = db.query(LedgerEntry).options(joinedload(LedgerEntry.account))
    
    if current_user.company_id:
        query = query.filter(LedgerEntry.company_id == current_user.company_id)
    
    if filters.get("from_date"):
        query = query.filter(LedgerEntry.transaction_date >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(LedgerEntry.transaction_date <= filters["to_date"])
    if filters.get("reference_type"):
        query = query.filter(LedgerEntry.reference_type == filters["reference_type"])
    if filters.get("account_id"):
        query = query.filter(LedgerEntry.accounting_account_id == filters["account_id"])
    
    page = filters.get("page", 1)
    limit = filters.get("limit", 20)
    return query.order_by(LedgerEntry.transaction_date.desc()).offset((page - 1) * limit).limit(limit).all()


def list_cash_transactions_for_company(db: Session, current_user: User, filters: dict):
    """Retrieve cash transactions for the current user's company.
    Always restrict to company_id for multi-tenant safety.
    Used for treasury export."""
    query = db.query(CashTransaction).options(
        joinedload(CashTransaction.cash_register),
        joinedload(CashTransaction.creator)
    )
    
    # Ensure multi-tenant isolation
    if current_user.company_id:
        query = query.join(CashRegister).filter(CashRegister.company_id == current_user.company_id)
    
    # Filter by date range
    if filters.get("from_date"):
        query = query.filter(CashTransaction.created_at >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(CashTransaction.created_at <= filters["to_date"])
    
    # Filter by transaction type (ENTRY / EXIT)
    if filters.get("transaction_type"):
        query = query.filter(CashTransaction.type == filters["transaction_type"])
    
    # Filter by cash register
    if filters.get("cash_register_id"):
        query = query.filter(CashTransaction.cash_register_id == filters["cash_register_id"])
    
    # Filter by source
    if filters.get("source"):
        query = query.filter(CashTransaction.source == filters["source"])
    
    page = filters.get("page", 1)
    limit = filters.get("limit", 20)
    return query.order_by(CashTransaction.created_at.desc()).offset((page - 1) * limit).limit(limit).all()


def list_projects_summary_for_company(db: Session, current_user: User, filters: dict):
    """Get project aggregations: total expenses, expense count, accounts used, departments, statuses.
    Always restrict to company_id for multi-tenant safety."""
    query = db.query(
        Project.id,
        Project.name,
        Project.code,
        Project.status,
        func.count(ExpenseRequest.id).label("expense_count"),
        func.sum(ExpenseRequest.amount).label("total_amount"),
    ).outerjoin(ExpenseRequest)
    
    if current_user.company_id:
        query = query.filter(Project.company_id == current_user.company_id)
    
    # Filter by date range
    if filters.get("from_date"):
        query = query.filter(ExpenseRequest.expense_date >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(ExpenseRequest.expense_date <= filters["to_date"])
    
    # Filter by status
    if filters.get("status"):
        query = query.filter(ExpenseRequest.status == filters["status"])
    
    # Only active projects by default
    if not filters.get("include_inactive"):
        query = query.filter(Project.is_active == True)
    
    results = query.group_by(Project.id, Project.name, Project.code, Project.status).all()
    
    return [
        {
            "project_id": r.id,
            "project_name": r.name,
            "project_code": r.code,
            "status": r.status,
            "expense_count": r.expense_count or 0,
            "total_amount": float(r.total_amount or 0),
        }
        for r in results
    ]


def list_departments_summary_for_company(db: Session, current_user: User, filters: dict):
    """Get department aggregations: expense count, total amount, categories used, accounts linked.
    Always restrict to company_id for multi-tenant safety."""
    query = db.query(
        Department.id,
        Department.name,
        func.count(ExpenseRequest.id).label("expense_count"),
        func.sum(ExpenseRequest.amount).label("total_amount"),
    ).outerjoin(ExpenseRequest)
    
    if current_user.company_id:
        query = query.filter(Department.company_id == current_user.company_id)
    
    # Filter by date range
    if filters.get("from_date"):
        query = query.filter(ExpenseRequest.expense_date >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(ExpenseRequest.expense_date <= filters["to_date"])
    
    # Only active departments by default
    if not filters.get("include_inactive"):
        query = query.filter(Department.is_active == True)
    
    results = query.group_by(Department.id, Department.name).all()
    
    return [
        {
            "department_id": r.id,
            "department_name": r.name,
            "expense_count": r.expense_count or 0,
            "total_amount": float(r.total_amount or 0),
        }
        for r in results
    ]


def list_audit_entries_for_company(db: Session, current_user: User, filters: dict):
    """Get audit trail for expenses: creator, approvals, and final status.
    Always restrict to company_id for multi-tenant safety."""
    query = db.query(ExpenseRequest).options(
        joinedload(ExpenseRequest.user),
        joinedload(ExpenseRequest.approval_logs).joinedload(ApprovalLog.user)
    )
    
    if current_user.company_id:
        query = query.filter(ExpenseRequest.company_id == current_user.company_id)
    
    # Filter by date range
    if filters.get("from_date"):
        query = query.filter(ExpenseRequest.created_at >= filters["from_date"])
    if filters.get("to_date"):
        query = query.filter(ExpenseRequest.created_at <= filters["to_date"])
    
    # Filter by status
    if filters.get("status"):
        query = query.filter(ExpenseRequest.status == filters["status"])
    
    page = filters.get("page", 1)
    limit = filters.get("limit", 100)  # Higher limit for audit exports
    expenses = query.order_by(ExpenseRequest.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    # Build audit trail for each expense
    audit_entries = []
    for expense in expenses:
        # Initialize audit entry
        audit_entry = {
            "reference_number": expense.reference_number,
            "created_by": expense.user.name if expense.user else "",
            "created_at": expense.created_at.strftime("%Y-%m-%d %H:%M") if expense.created_at else "",
            "status_final": expense.status,
            "approved_manager_by": "",
            "approved_manager_at": "",
            "approved_accounting_by": "",
            "approved_accounting_at": "",
            "paid_by": "",
            "paid_at": "",
        }
        
        # Parse approval logs to extract timeline
        if expense.approval_logs:
            for log in expense.approval_logs:
                user_name = log.user.name if log.user else ""
                log_date = log.created_at.strftime("%Y-%m-%d %H:%M") if log.created_at else ""
                
                if log.action == "approved_manager":
                    audit_entry["approved_manager_by"] = user_name
                    audit_entry["approved_manager_at"] = log_date
                elif log.action == "approved_accounting":
                    audit_entry["approved_accounting_by"] = user_name
                    audit_entry["approved_accounting_at"] = log_date
                elif log.action == "paid":
                    audit_entry["paid_by"] = user_name
                    audit_entry["paid_at"] = log_date
        
        audit_entries.append(audit_entry)
    
    return audit_entries

