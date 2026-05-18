from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.advance import AdvanceRequest, AdvanceStatus
from app.models.expense import ExpenseRequest, ExpenseStatus
from app.schemas.advance import AdvanceCreateSchema, AdvanceResponse, AdvanceUpdateSchema
from app.core.dependencies import get_current_active_user

router = APIRouter(prefix="/advances", tags=["advances"])


def get_advance_for_company(db: Session, advance_id: str, current_user: User) -> Optional[AdvanceRequest]:
    try:
        adv_uuid = UUID(advance_id)
    except ValueError:
        return None

    query = db.query(AdvanceRequest).filter(
        AdvanceRequest.id == adv_uuid,
        AdvanceRequest.company_id == current_user.company_id
    )

    if current_user.role == "employee":
        query = query.filter(AdvanceRequest.user_id == current_user.id)

    return query.first()


def calculate_advance_sums(advance: AdvanceRequest):
    # Sum only approved or paid or draft or pending (basically not rejected/cancelled) expenses
    valid_statuses = {ExpenseStatus.draft.value, ExpenseStatus.pending.value, ExpenseStatus.approved.value, ExpenseStatus.paid.value}
    matched_sum = sum(Decimal(str(e.amount)) for e in advance.expenses if e.status in valid_statuses)
    
    matched_sum_dec = Decimal(str(matched_sum)).quantize(Decimal("0.00"))
    amount_dec = Decimal(str(advance.amount)).quantize(Decimal("0.00"))
    
    advance.matched_expenses_sum = matched_sum_dec
    advance.balance = amount_dec - matched_sum_dec


@router.post("", response_model=AdvanceResponse, status_code=status.HTTP_201_CREATED)
def create_advance(
    advance_in: AdvanceCreateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur sans entreprise")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise introuvable")

    currency = advance_in.currency or getattr(company, "currency", "XOF")
    if not currency:
        currency = "XOF"

    submitted_at = datetime.utcnow() if advance_in.status == AdvanceStatus.pending.value else None

    advance = AdvanceRequest(
        company_id=current_user.company_id,
        user_id=current_user.id,
        amount=advance_in.amount,
        currency=currency,
        description=advance_in.description,
        status=advance_in.status,
        submitted_at=submitted_at,
        category_id=advance_in.category_id
    )
    db.add(advance)
    db.commit()
    db.refresh(advance)
    
    calculate_advance_sums(advance)
    return advance


@router.get("", response_model=List[AdvanceResponse])
def list_advances(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur sans entreprise")

    query = db.query(AdvanceRequest).filter(AdvanceRequest.company_id == current_user.company_id)

    if current_user.role == "employee":
        query = query.filter(AdvanceRequest.user_id == current_user.id)

    if status_filter:
        query = query.filter(AdvanceRequest.status == status_filter)

    query = query.order_by(AdvanceRequest.created_at.desc())
    advances = query.all()

    for adv in advances:
        calculate_advance_sums(adv)

    return advances


@router.get("/{advance_id}", response_model=AdvanceResponse)
def get_advance(
    advance_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    advance = get_advance_for_company(db, advance_id, current_user)
    if not advance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande d'avance introuvable")

    calculate_advance_sums(advance)
    return advance


@router.post("/{advance_id}/approve", response_model=AdvanceResponse)
def approve_advance(
    advance_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    advance = get_advance_for_company(db, advance_id, current_user)
    if not advance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande d'avance introuvable")

    # Only manager, admin or backup manager can approve
    is_authorized = current_user.role in ["manager", "admin", "super_admin"] or current_user.is_backup_manager
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les managers et administrateurs peuvent approuver")

    # Anti-self approval
    if current_user.id == advance.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez pas approuver votre propre demande d'avance")

    if advance.status != AdvanceStatus.pending.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seules les demandes en attente peuvent être approuvées")

    advance.status = AdvanceStatus.approved.value
    advance.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(advance)
    
    calculate_advance_sums(advance)
    return advance


@router.post("/{advance_id}/disburse", response_model=AdvanceResponse)
def disburse_advance(
    advance_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    advance = get_advance_for_company(db, advance_id, current_user)
    if not advance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande d'avance introuvable")

    # Only accountant, admin or backup accountant can disburse
    is_authorized = current_user.role in ["accountant", "admin", "super_admin"] or current_user.is_backup_accountant
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les comptables et administrateurs peuvent remettre les fonds")

    # Anti-self disbursement
    if current_user.id == advance.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez pas vous remettre des fonds à vous-même")

    if advance.status != AdvanceStatus.approved.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Les fonds ne peuvent être remis que pour des demandes approuvées")

    advance.status = AdvanceStatus.disbursed.value
    advance.disbursed_at = datetime.utcnow()
    db.commit()
    db.refresh(advance)
    
    calculate_advance_sums(advance)
    return advance


@router.post("/{advance_id}/reject", response_model=AdvanceResponse)
def reject_advance(
    advance_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    advance = get_advance_for_company(db, advance_id, current_user)
    if not advance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande d'avance introuvable")

    # Only manager, accountant or admin can reject
    is_authorized = current_user.role in ["manager", "accountant", "admin", "super_admin"] or current_user.is_backup_manager or current_user.is_backup_accountant
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Action non autorisée")

    # Anti-self rejection is just logical (can't reject one's own)
    if current_user.id == advance.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez pas rejeter votre propre demande")

    if advance.status not in [AdvanceStatus.pending.value, AdvanceStatus.approved.value]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action impossible sur ce statut")

    advance.status = AdvanceStatus.rejected.value
    db.commit()
    db.refresh(advance)
    
    calculate_advance_sums(advance)
    return advance


@router.post("/{advance_id}/reconcile", response_model=AdvanceResponse)
def reconcile_advance(
    advance_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    advance = get_advance_for_company(db, advance_id, current_user)
    if not advance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande d'avance introuvable")

    # Only accountant, admin or backup accountant can close/reconcile
    is_authorized = current_user.role in ["accountant", "admin", "super_admin"] or current_user.is_backup_accountant
    if not is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les comptables et administrateurs peuvent clôturer les avances")

    if advance.status != AdvanceStatus.disbursed.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seules les avances en cours d'utilisation peuvent être clôturées")

    advance.status = AdvanceStatus.reconciled.value
    advance.reconciled_at = datetime.utcnow()

    # Automatically transition all non-rejected/non-cancelled linked expenses to 'paid'
    from app.models.expense import ExpenseStatus
    for exp in advance.expenses:
        if exp.status not in [ExpenseStatus.rejected.value, ExpenseStatus.cancelled.value]:
            exp.status = ExpenseStatus.paid.value

    db.commit()
    db.refresh(advance)
    
    calculate_advance_sums(advance)
    return advance
