from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.schemas.fiscal_year import FiscalYearCreate, FiscalYearResponse
from app.services.fiscal_year_service import (
    list_fiscal_years,
    get_active_fiscal_year,
    create_fiscal_year,
    close_fiscal_year,
    enrich_fiscal_year_with_stats,
)

router = APIRouter(prefix="/fiscal-years", tags=["Exercices Comptables"])


def require_admin_or_accountant(current_user: User):
    if current_user.role not in ("admin", "accountant", "super_admin"):
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs et comptables.")


@router.get("", response_model=List[FiscalYearResponse])
def get_fiscal_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Liste tous les exercices comptables de l'entreprise."""
    require_admin_or_accountant(current_user)
    years = list_fiscal_years(db, current_user.company_id)
    return [enrich_fiscal_year_with_stats(db, fy) for fy in years]


@router.get("/active", response_model=FiscalYearResponse)
def get_active(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retourne l'exercice comptable actif (ouvert) de l'entreprise."""
    fy = get_active_fiscal_year(db, current_user.company_id)
    if not fy:
        raise HTTPException(status_code=404, detail="Aucun exercice comptable ouvert trouvé.")
    return enrich_fiscal_year_with_stats(db, fy)


@router.post("", response_model=FiscalYearResponse, status_code=201)
def create(
    data: FiscalYearCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Crée un nouvel exercice comptable (admin seulement)."""
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent créer un exercice.")
    fy = create_fiscal_year(
        db,
        company_id=current_user.company_id,
        label=data.label,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    return enrich_fiscal_year_with_stats(db, fy)


@router.post("/{fiscal_year_id}/close", response_model=FiscalYearResponse)
def close(
    fiscal_year_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Clôture un exercice comptable.
    Bloqué si des bons 'En attente' ou 'Brouillon' existent encore.
    """
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Seuls les administrateurs peuvent clôturer un exercice.")
    fy = close_fiscal_year(db, fiscal_year_id, current_user.company_id, current_user)
    return enrich_fiscal_year_with_stats(db, fy)
