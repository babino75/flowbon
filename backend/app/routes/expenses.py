import os
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_current_active_user, get_db
from app.models.attachment import Attachment
from app.models.company import Company
from app.models.expense import ExpenseRequest, ExpenseStatus
from app.models.user import User
from app.models.approval_log import ApprovalLog
from app.schemas.attachment import AttachmentResponse
from app.schemas.approval_log import ApprovalLogResponse, RejectSchema, CommentSchema
from app.schemas.expense import ExpenseCreateSchema, ExpenseResponse, ExpenseUpdateSchema
from app.services.tenant import (
    get_expense_for_company,
    get_attachment_for_expense,
    list_expenses_for_company,
    get_expense_logs_for_company,
)
from app.services import notification_service
from app.utils.files import MAX_ATTACHMENTS_PER_EXPENSE, ensure_upload_dir, save_upload, validate_upload

router = APIRouter(prefix="/expenses", tags=["expenses"])

UPLOAD_DIR = settings.uploads_dir
ensure_upload_dir(UPLOAD_DIR)


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur sans entreprise")

    if expense_in.status not in {ExpenseStatus.draft.value, ExpenseStatus.pending.value}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status invalide")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise introuvable")

    currency = expense_in.currency or getattr(company, "default_currency", "EUR")
    if not currency:
        currency = "EUR"

    submitted_at = datetime.utcnow() if expense_in.status == ExpenseStatus.pending.value else None

    expense = ExpenseRequest(
        company_id=current_user.company_id,
        user_id=current_user.id,
        amount=expense_in.amount,
        currency=currency,
        category_id=expense_in.category_id,
        description=expense_in.description,
        status=expense_in.status,
        expense_date=expense_in.expense_date,
        submitted_at=submitted_at,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    # Log action
    log = ApprovalLog(
        company_id=expense.company_id,
        expense_request_id=expense.id,
        user_id=current_user.id,
        action="created"
    )
    db.add(log)
    if expense.status == ExpenseStatus.pending.value:
        log_submit = ApprovalLog(
            company_id=expense.company_id,
            expense_request_id=expense.id,
            user_id=current_user.id,
            action="submitted"
        )
        db.add(log_submit)
    
    db.commit()
    db.refresh(expense)

    if expense.status == ExpenseStatus.pending.value:
        # Notify managers when created directly with pending status
        notification_service.on_expense_submitted(db, expense, current_user)

    return expense



@router.get("", response_model=List[ExpenseResponse])
def list_expenses(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    filters = {
        "status": status,
        "category": category,
        "from_date": from_date,
        "to_date": to_date,
        "page": page,
        "limit": limit,
    }
    return list_expenses_for_company(db, current_user, filters)


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")
    return expense


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    expense_update: ExpenseUpdateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    is_admin = current_user.role in ["admin", "super_admin"]

    # Only creator or admin can update
    if expense.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    # Non-admins can only update draft or pending requests
    if not is_admin and expense.status not in {ExpenseStatus.draft.value, ExpenseStatus.pending.value}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le bon ne peut plus être modifié")

    for field, value in expense_update.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    is_admin = current_user.role in ["admin", "super_admin"]

    # Only creator or admin can delete
    if expense.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    # Non-admins can only delete draft requests
    if not is_admin and expense.status != ExpenseStatus.draft.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seuls les brouillons peuvent être supprimés")

    db.delete(expense)
    db.commit()
    return {"message": "Bon supprimé"}


@router.post("/{expense_id}/submit", response_model=ExpenseResponse)
def submit_expense(
    expense_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    if expense.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    if expense.status not in {ExpenseStatus.draft.value, ExpenseStatus.rejected.value}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le bon doit être en brouillon ou refusé pour être soumis")

    expense.status = ExpenseStatus.pending.value
    expense.submitted_at = datetime.utcnow()
    
    log = ApprovalLog(
        company_id=expense.company_id,
        expense_request_id=expense.id,
        user_id=current_user.id,
        action="submitted"
    )
    db.add(log)
    
    db.commit()
    db.refresh(expense)
    # Notify managers
    notification_service.on_expense_submitted(db, expense, current_user)
    return expense


@router.post("/{expense_id}/cancel", response_model=ExpenseResponse)
def cancel_expense(
    expense_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    if expense.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    if expense.status not in {ExpenseStatus.draft.value, ExpenseStatus.pending.value}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce bon ne peut pas être annulé")

    expense.status = ExpenseStatus.cancelled.value
    
    log = ApprovalLog(
        company_id=expense.company_id,
        expense_request_id=expense.id,
        user_id=current_user.id,
        action="cancelled"
    )
    db.add(log)
    
    db.commit()
    db.refresh(expense)
    return expense


@router.post("/{expense_id}/attachments", response_model=List[AttachmentResponse])
def upload_attachments(
    expense_id: str,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    is_admin = current_user.role in ["admin", "super_admin"]

    # Only creator or admin can upload
    if expense.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    # Non-admins cannot upload attachments on approved or paid expenses
    if not is_admin and expense.status not in {ExpenseStatus.draft.value, ExpenseStatus.pending.value}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Impossible d'ajouter des justificatifs à un bon validé")

    existing_attachments = db.query(Attachment).filter(Attachment.expense_request_id == expense.id).count()
    if existing_attachments + len(files) > MAX_ATTACHMENTS_PER_EXPENSE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Maximum {MAX_ATTACHMENTS_PER_EXPENSE} justificatifs par bon")

    saved_attachments: List[Attachment] = []
    upload_dir = Path(UPLOAD_DIR)

    for file in files:
        file_size = validate_upload(file)
        saved_file_name = save_upload(file, upload_dir)
        file_url = f"/uploads/{saved_file_name}"

        attachment = Attachment(
            company_id=expense.company_id,
            expense_request_id=expense.id,
            file_url=file_url,
            file_name=file.filename,
            file_size=file_size,
            file_type=file.content_type or "application/octet-stream",
        )
        db.add(attachment)
        saved_attachments.append(attachment)

    db.commit()
    for attachment in saved_attachments:
        db.refresh(attachment)
    return saved_attachments


@router.delete("/{expense_id}/attachments/{attachment_id}")
def delete_attachment(
    expense_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    is_admin = current_user.role in ["admin", "super_admin"]

    # Only creator or admin can delete
    if expense.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    # Non-admins cannot delete attachments on approved or paid expenses
    if not is_admin and expense.status not in {ExpenseStatus.draft.value, ExpenseStatus.pending.value}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Impossible de supprimer un justificatif d'un bon validé")

    attachment = get_attachment_for_expense(db, attachment_id, expense)
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Justificatif non trouvé")

    db.delete(attachment)
    db.commit()
    return {"message": "Justificatif supprimé"}


def can_approve(approver: User, expense: ExpenseRequest) -> bool:
    if approver.id == expense.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez pas approuver votre propre bon.")
    if approver.role not in ["manager", "admin", "super_admin"] and not approver.is_backup_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les managers et admins peuvent approuver.")
    return True


@router.post("/{expense_id}/approve", response_model=ExpenseResponse)
def approve_expense(
    expense_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    can_approve(current_user, expense)

    if expense.status != ExpenseStatus.pending.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce bon n'est pas en attente d'approbation")

    expense.status = ExpenseStatus.approved.value
    
    log = ApprovalLog(
        company_id=expense.company_id,
        expense_request_id=expense.id,
        user_id=current_user.id,
        action="approved"
    )
    db.add(log)
    db.commit()
    db.refresh(expense)
    # Notify employee + accountants
    notification_service.on_expense_approved(db, expense, current_user)
    return expense


@router.post("/{expense_id}/reject", response_model=ExpenseResponse)
def reject_expense(
    expense_id: str,
    reject_data: RejectSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    can_approve(current_user, expense)

    if expense.status != ExpenseStatus.pending.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce bon n'est pas en attente d'approbation")

    expense.status = ExpenseStatus.rejected.value
    
    log = ApprovalLog(
        company_id=expense.company_id,
        expense_request_id=expense.id,
        user_id=current_user.id,
        action="rejected",
        comment=reject_data.comment
    )
    db.add(log)
    db.commit()
    db.refresh(expense)
    # Notify employee with rejection reason
    notification_service.on_expense_rejected(db, expense, current_user, reject_data.comment)
    return expense


@router.post("/{expense_id}/mark-as-paid", response_model=ExpenseResponse)
def mark_expense_as_paid(
    expense_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    if current_user.role not in ["accountant", "admin", "super_admin"] and not current_user.is_backup_accountant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé pour les paiements")

    if current_user.id == expense.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez pas mettre en paiement votre propre bon.")

    if expense.status != ExpenseStatus.approved.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le bon doit être approuvé avant paiement")

    expense.status = ExpenseStatus.paid.value
    
    log = ApprovalLog(
        company_id=expense.company_id,
        expense_request_id=expense.id,
        user_id=current_user.id,
        action="paid"
    )
    db.add(log)
    db.commit()
    db.refresh(expense)
    # Notify employee that payment is done
    notification_service.on_expense_paid(db, expense, current_user)
    return expense


@router.post("/{expense_id}/comment", response_model=ApprovalLogResponse)
def add_comment(
    expense_id: str,
    comment_data: CommentSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    log = ApprovalLog(
        company_id=expense.company_id,
        expense_request_id=expense.id,
        user_id=current_user.id,
        action="commented",
        comment=comment_data.comment
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    
    # Optional: populate user name for immediate return
    user_name = db.query(User.name).filter(User.id == log.user_id).scalar()
    log.user_name = user_name
    
    return log


@router.get("/{expense_id}/logs", response_model=List[ApprovalLogResponse])
def get_expense_logs(
    expense_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    expense = get_expense_for_company(db, expense_id, current_user)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bon de dépense non trouvé")

    logs = get_expense_logs_for_company(db, expense)
    
    # Enhance logs with user names
    for log in logs:
        user_name = db.query(User.name).filter(User.id == log.user_id).scalar()
        log.user_name = user_name
        
    return logs
