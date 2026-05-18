from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_active_user, get_db
from app.core.security import create_access_token
from app.models.advance import AdvanceRequest, AdvanceStatus as AdvStatusEnum
from app.models.company import Company
from app.models.expense import ExpenseRequest, ExpenseStatus
from app.models.user import User

router = APIRouter(prefix="/super-admin", tags=["super-admin"])


# ─── Guard ─────────────────────────────────────────────────────────────────────

def require_super_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux Super Administrateurs de la plateforme FlowBon.",
        )
    return current_user


# ─── Pydantic Schemas (inline for this module) ─────────────────────────────────

class CompanyListItem(BaseModel):
    id: UUID
    name: str
    email: Optional[str] = None
    country: Optional[str] = None
    subscription_plan: str
    subscription_status: str
    max_users: int
    currency: str
    user_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class GlobalStats(BaseModel):
    total_companies: int
    total_users: int
    total_active_users: int
    total_expenses: int
    total_expense_amount: float
    total_advances_active: int
    new_companies_this_month: int


class SubscriptionUpdateSchema(BaseModel):
    subscription_plan: Optional[str] = None   # free | premium | enterprise
    subscription_status: Optional[str] = None  # active | suspended | trial
    max_users: Optional[int] = None


class ImpersonationResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    target_company_name: str
    target_admin_email: str
    expires_in_minutes: int


class AuditLogItem(BaseModel):
    timestamp: str
    action: str
    actor: str
    target: str
    detail: str


# ─── In-Memory Audit Log (simple ring buffer, 200 entries) ────────────────────

_audit_log: List[dict] = []


def _log_action(actor_email: str, action: str, target: str, detail: str = ""):
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "action": action,
        "actor": actor_email,
        "target": target,
        "detail": detail,
    }
    _audit_log.append(entry)
    if len(_audit_log) > 200:
        _audit_log.pop(0)


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=GlobalStats)
def get_global_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Indicateurs de santé globaux de la plateforme FlowBon."""
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

    total_expenses = db.query(func.count(ExpenseRequest.id)).scalar() or 0
    total_amount_row = db.query(func.sum(ExpenseRequest.amount)).scalar()
    total_expense_amount = float(total_amount_row) if total_amount_row else 0.0

    total_advances_active = (
        db.query(func.count(AdvanceRequest.id))
        .filter(AdvanceRequest.status.in_(["approved", "disbursed"]))
        .scalar()
        or 0
    )

    first_day_this_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    new_companies_this_month = (
        db.query(func.count(Company.id))
        .filter(Company.created_at >= first_day_this_month)
        .scalar()
        or 0
    )

    return GlobalStats(
        total_companies=total_companies,
        total_users=total_users,
        total_active_users=total_active_users,
        total_expenses=total_expenses,
        total_expense_amount=total_expense_amount,
        total_advances_active=total_advances_active,
        new_companies_this_month=new_companies_this_month,
    )


@router.get("/companies", response_model=List[CompanyListItem])
def list_all_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Liste exhaustive de toutes les entreprises clientes inscrites sur FlowBon."""
    companies = db.query(Company).order_by(Company.created_at.desc()).all()
    result = []
    for c in companies:
        user_count = db.query(func.count(User.id)).filter(User.company_id == c.id).scalar() or 0
        result.append(
            CompanyListItem(
                id=c.id,
                name=c.name,
                email=c.email,
                country=c.country,
                subscription_plan=c.subscription_plan,
                subscription_status=c.subscription_status,
                max_users=c.max_users,
                currency=c.currency,
                user_count=user_count,
                created_at=c.created_at,
            )
        )
    return result


@router.patch("/companies/{company_id}/subscription")
def update_company_subscription(
    company_id: str,
    payload: SubscriptionUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Modifier à chaud le plan, le statut ou la limite d'utilisateurs d'une entreprise cliente."""
    try:
        uid = UUID(company_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID invalide")

    company = db.query(Company).filter(Company.id == uid).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise introuvable")

    changes = []
    if payload.subscription_plan is not None:
        allowed_plans = {"free", "premium", "enterprise"}
        if payload.subscription_plan not in allowed_plans:
            raise HTTPException(status_code=400, detail=f"Plan invalide. Valeurs : {allowed_plans}")
        changes.append(f"plan: {company.subscription_plan} → {payload.subscription_plan}")
        company.subscription_plan = payload.subscription_plan

    if payload.subscription_status is not None:
        allowed_statuses = {"active", "suspended", "trial"}
        if payload.subscription_status not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs : {allowed_statuses}")
        changes.append(f"statut: {company.subscription_status} → {payload.subscription_status}")
        company.subscription_status = payload.subscription_status

    if payload.max_users is not None:
        if payload.max_users < 1:
            raise HTTPException(status_code=400, detail="max_users doit être ≥ 1")
        changes.append(f"max_users: {company.max_users} → {payload.max_users}")
        company.max_users = payload.max_users

    db.commit()
    db.refresh(company)

    _log_action(
        actor_email=current_user.email,
        action="SUBSCRIPTION_UPDATE",
        target=company.name,
        detail=", ".join(changes) if changes else "Aucune modification",
    )

    return {"message": "Abonnement mis à jour avec succès", "company": company.name, "changes": changes}


@router.post("/impersonate/{company_id}", response_model=ImpersonationResponse)
def impersonate_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """
    Génère un token d'accès temporaire (30 min) pour l'administrateur principal
    de l'entreprise cible. Permet le support technique en direct sans connaître
    le mot de passe du client. Action enregistrée en audit log.
    """
    try:
        uid = UUID(company_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID invalide")

    company = db.query(Company).filter(Company.id == uid).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise introuvable")

    # Find the primary admin of the target company
    target_admin = (
        db.query(User)
        .filter(User.company_id == uid, User.role == "admin", User.is_active == True)
        .order_by(User.created_at.asc())
        .first()
    )
    if not target_admin:
        # Fallback to any active user in the company
        target_admin = (
            db.query(User)
            .filter(User.company_id == uid, User.is_active == True)
            .order_by(User.created_at.asc())
            .first()
        )
    if not target_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun administrateur ou collaborateur actif trouvé dans cette entreprise",
        )

    # Short-lived impersonation token (30 minutes)
    IMPERSONATE_EXPIRE_MINUTES = 30
    expire = datetime.utcnow() + timedelta(minutes=IMPERSONATE_EXPIRE_MINUTES)
    from jose import jwt as jose_jwt
    token_payload = {
        "exp": expire,
        "sub": str(target_admin.id),
        "type": "access",
        "impersonated_by": str(current_user.id),
    }
    impersonation_token = jose_jwt.encode(
        token_payload, settings.secret_key, algorithm=settings.algorithm
    )

    _log_action(
        actor_email=current_user.email,
        action="IMPERSONATION_START",
        target=company.name,
        detail=f"Support initié sur le compte admin : {target_admin.email}",
    )

    return ImpersonationResponse(
        access_token=impersonation_token,
        target_company_name=company.name,
        target_admin_email=target_admin.email,
        expires_in_minutes=IMPERSONATE_EXPIRE_MINUTES,
    )


@router.get("/audit-logs", response_model=List[AuditLogItem])
def get_audit_logs(
    current_user: User = Depends(require_super_admin),
):
    """Journalisation chronologique des actions d'administration globale (200 dernières)."""
    return list(reversed(_audit_log))


@router.delete("/companies/{company_id}")
def purge_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """
    Purge complète d'une entreprise et de toutes ses données en cascade,
    y compris la suppression physique des fichiers de justificatifs du disque.
    """
    import os
    from app.models.attachment import Attachment
    from app.models.invitation import Invitation
    from app.models.token import RefreshToken, PasswordResetToken
    from app.models.approval_log import ApprovalLog
    from app.models.expense import ExpenseRequest
    from app.models.advance import AdvanceRequest

    try:
        uid = UUID(company_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID invalide")

    company = db.query(Company).filter(Company.id == uid).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise introuvable")

    company_name = company.name

    # 1. Physical file cleanup
    attachments = (
        db.query(Attachment)
        .join(ExpenseRequest)
        .filter(ExpenseRequest.company_id == uid)
        .all()
    )
    deleted_files_count = 0
    for att in attachments:
        if att.file_path:
            try:
                clean_path = att.file_path.lstrip("/")
                for path_to_try in [att.file_path, clean_path, os.path.join("/app", clean_path)]:
                    if os.path.exists(path_to_try) and os.path.isfile(path_to_try):
                        os.remove(path_to_try)
                        deleted_files_count += 1
                        break
            except Exception:
                pass

    # 2. Database cascading cleanup
    # Expense attachments
    db.query(Attachment).filter(
        Attachment.expense_request_id.in_(
            db.query(ExpenseRequest.id).filter(ExpenseRequest.company_id == uid)
        )
    ).delete(synchronize_session=False)

    # Attachments referencing company directly
    db.query(Attachment).filter(Attachment.company_id == uid).delete(synchronize_session=False)

    # Approval logs
    db.query(ApprovalLog).filter(
        ApprovalLog.expense_request_id.in_(
            db.query(ExpenseRequest.id).filter(ExpenseRequest.company_id == uid)
        )
    ).delete(synchronize_session=False)

    # Approval logs referencing company directly
    db.query(ApprovalLog).filter(ApprovalLog.company_id == uid).delete(synchronize_session=False)

    # Expenses
    db.query(ExpenseRequest).filter(ExpenseRequest.company_id == uid).delete(synchronize_session=False)

    # Fiscal Years
    from app.models.fiscal_year import FiscalYear
    db.query(FiscalYear).filter(FiscalYear.company_id == uid).delete(synchronize_session=False)

    # Advances
    db.query(AdvanceRequest).filter(AdvanceRequest.company_id == uid).delete(synchronize_session=False)

    # Invitations
    db.query(Invitation).filter(Invitation.company_id == uid).delete(synchronize_session=False)

    # Expense categories
    from app.models.expense import ExpenseCategory
    db.query(ExpenseCategory).filter(ExpenseCategory.company_id == uid).delete(synchronize_session=False)

    # Notifications
    from app.models.notification import Notification, NotificationPreferences
    db.query(Notification).filter(Notification.company_id == uid).delete(synchronize_session=False)

    # User IDs for user-related token & preference deletions
    user_ids = [u.id for u in db.query(User).filter(User.company_id == uid).all()]
    if user_ids:
        db.query(RefreshToken).filter(RefreshToken.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(NotificationPreferences).filter(NotificationPreferences.user_id.in_(user_ids)).delete(synchronize_session=False)

    # Users
    db.query(User).filter(User.company_id == uid).delete(synchronize_session=False)

    # Company
    db.delete(company)
    db.commit()

    _log_action(
        actor_email=current_user.email,
        action="COMPANY_PURGE",
        target=company_name,
        detail=f"Purge totale réussie. Données DB effacées et {deleted_files_count} fichiers de justificatifs supprimés du disque.",
    )

    return {
        "message": "Entreprise et données associées purgées avec succès.",
        "company_name": company_name,
        "files_deleted": deleted_files_count,
    }
