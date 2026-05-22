from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreateSchema, CompanyResponse, CompanyUpdateSchema

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company_in: CompanyCreateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    company = Company(**company_in.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.post("/client", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_client_company(
    company_in: CompanyCreateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    # Create the company
    company_data = company_in.model_dump()
    company_data["subscription_status"] = "trial"
    company_data["subscription_plan"] = "free"
    
    company = Company(**company_data)
    db.add(company)
    db.commit()
    db.refresh(company)

    # Link the admin to this new company via UserCompany
    from app.models.user_company import UserCompany
    user_company = UserCompany(
        user_id=current_user.id,
        company_id=company.id,
        role="admin"
    )
    db.add(user_company)
    db.commit()

    return company


@router.get("/me", response_model=CompanyResponse)
def read_my_company(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")
    return company


@router.patch("/me", response_model=CompanyResponse)
def update_my_company(
    company_in: CompanyUpdateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    update_data = company_in.model_dump(exclude_unset=True)

    # Restreindre les champs sensibles si l'utilisateur n'est pas super_admin
    if current_user.role != "super_admin":
        sensitive_fields = ["subscription_plan", "subscription_status", "max_users"]
        for field in sensitive_fields:
            update_data.pop(field, None)

    for field, value in update_data.items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return company


@router.post("/activate-trial", response_model=CompanyResponse)
def activate_company_trial(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Activer la période d'essai de 7 jours pour une entreprise en attente d'abonnement."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul l'administrateur de l'entreprise peut activer la période d'essai.",
        )
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    if company.subscription_status != "pending_selection":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La période d'essai ne peut être activée que pour les nouveaux comptes en attente d'abonnement.",
        )

    from datetime import datetime, timedelta
    company.subscription_plan = "free"
    company.subscription_status = "trial"
    company.trial_expires_at = datetime.utcnow() + timedelta(days=7)
    db.commit()
    db.refresh(company)
    return company
