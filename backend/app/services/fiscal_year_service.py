from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models.fiscal_year import FiscalYear
from app.models.expense import ExpenseRequest
from app.models.user import User


def get_active_fiscal_year(db: Session, company_id: UUID) -> Optional[FiscalYear]:
    """Retourne l'exercice comptable ouvert courant de l'entreprise."""
    return (
        db.query(FiscalYear)
        .filter(FiscalYear.company_id == company_id, FiscalYear.status == "open")
        .order_by(FiscalYear.start_date.desc())
        .first()
    )


def list_fiscal_years(db: Session, company_id: UUID):
    """Liste tous les exercices comptables d'une entreprise (du plus récent au plus ancien)."""
    return (
        db.query(FiscalYear)
        .filter(FiscalYear.company_id == company_id)
        .order_by(FiscalYear.start_date.desc())
        .all()
    )


def get_fiscal_year_by_id(db: Session, fiscal_year_id: UUID, company_id: UUID) -> Optional[FiscalYear]:
    return (
        db.query(FiscalYear)
        .filter(FiscalYear.id == fiscal_year_id, FiscalYear.company_id == company_id)
        .first()
    )


def create_fiscal_year(db: Session, company_id: UUID, label: str, start_date, end_date) -> FiscalYear:
    """Crée un nouvel exercice comptable. Valide qu'il n'y a pas de chevauchement de dates."""
    import uuid as uuid_lib

    # Vérifier qu'il n'y a pas déjà un exercice ouvert qui chevauche ces dates
    existing = (
        db.query(FiscalYear)
        .filter(
            FiscalYear.company_id == company_id,
            FiscalYear.status == "open",
            FiscalYear.start_date <= end_date,
            FiscalYear.end_date >= start_date,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Un exercice ouvert chevauche déjà cette période : '{existing.label}'."
        )

    fiscal_year = FiscalYear(
        id=uuid_lib.uuid4(),
        company_id=company_id,
        label=label,
        start_date=start_date,
        end_date=end_date,
        status="open",
    )
    db.add(fiscal_year)
    db.commit()
    db.refresh(fiscal_year)
    return fiscal_year


def close_fiscal_year(db: Session, fiscal_year_id: UUID, company_id: UUID, closed_by: User) -> FiscalYear:
    """
    Clôture un exercice comptable.
    Bloque la clôture si des bons 'pending' ou 'draft' existent encore.
    """
    fy = get_fiscal_year_by_id(db, fiscal_year_id, company_id)
    if not fy:
        raise HTTPException(status_code=404, detail="Exercice comptable introuvable.")
    if fy.status == "closed":
        raise HTTPException(status_code=400, detail="Cet exercice est déjà clôturé.")

    # Vérifier qu'il n'y a pas de bons en attente ou en brouillon
    blocking_count = (
        db.query(func.count(ExpenseRequest.id))
        .filter(
            ExpenseRequest.fiscal_year_id == fiscal_year_id,
            ExpenseRequest.status.in_(["pending", "draft"]),
        )
        .scalar()
    )
    if blocking_count and blocking_count > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Impossible de clôturer l'exercice : {blocking_count} bon(s) sont encore "
                f"en brouillon ou en attente de traitement. Veuillez les traiter avant de clôturer."
            ),
        )

    fy.status = "closed"
    fy.closed_at = datetime.utcnow()
    fy.closed_by_id = closed_by.id
    db.commit()
    db.refresh(fy)
    return fy


def get_or_create_default_fiscal_year(db: Session, company_id: UUID) -> FiscalYear:
    """
    Utilisé lors de la migration : crée un exercice 'Historique' si aucun n'existe.
    Également appelé lors de l'inscription d'une nouvelle entreprise pour créer l'exercice courant.
    """
    import uuid as uuid_lib
    from datetime import date

    existing = get_active_fiscal_year(db, company_id)
    if existing:
        return existing

    now = datetime.utcnow()
    fy = FiscalYear(
        id=uuid_lib.uuid4(),
        company_id=company_id,
        label=str(now.year),
        start_date=date(now.year, 1, 1),
        end_date=date(now.year, 12, 31),
        status="open",
    )
    db.add(fy)
    db.commit()
    db.refresh(fy)
    return fy


def enrich_fiscal_year_with_stats(db: Session, fy: FiscalYear) -> dict:
    """Enrichit un exercice avec des statistiques résumées."""
    rows = (
        db.query(ExpenseRequest.status, func.count(ExpenseRequest.id), func.sum(ExpenseRequest.amount))
        .filter(ExpenseRequest.fiscal_year_id == fy.id)
        .group_by(ExpenseRequest.status)
        .all()
    )

    total_expenses = 0
    total_paid = 0.0
    total_approved = 0.0
    pending_count = 0

    for status, count, total in rows:
        total_expenses += count
        if status == "paid":
            total_paid += float(total or 0)
        elif status == "approved":
            total_approved += float(total or 0)
        elif status in ("pending", "draft"):
            pending_count += count

    result = {
        "id": fy.id,
        "company_id": fy.company_id,
        "label": fy.label,
        "start_date": fy.start_date,
        "end_date": fy.end_date,
        "status": fy.status,
        "closed_at": fy.closed_at,
        "closed_by_id": fy.closed_by_id,
        "created_at": fy.created_at,
        "updated_at": fy.updated_at,
        "total_expenses": total_expenses,
        "total_paid": total_paid,
        "total_approved": total_approved,
        "pending_count": pending_count,
    }
    return result
