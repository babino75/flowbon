from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.cash_register import CashRegister, CashTransaction
from app.models.cash_source import CashSource
from app.utils.files import save_upload, validate_upload
from app.schemas.cash_register import (
    CashRegisterCreateSchema,
    CashRegisterResponse,
    CashTransactionManualCreate,
    CashTransactionResponse,
    CashRegisterAssignCashiers,
    CashRegisterUpdateSchema,
)
from app.schemas.cash_source import CashSourceCreate, CashSourceResponse
from app.core.dependencies import get_current_active_user
from app.services.fiscal_year_service import get_active_fiscal_year

router = APIRouter(prefix="/caisses", tags=["caisses"])


def get_cash_register_for_company(db: Session, caisse_id: str, current_user: User) -> Optional[CashRegister]:
    try:
        caisse_uuid = UUID(caisse_id)
    except ValueError:
        return None

    caisse = db.query(CashRegister).filter(
        CashRegister.id == caisse_uuid,
        CashRegister.company_id == current_user.company_id
    ).first()

    # Sécurité : Si l'utilisateur est un caissier, il doit être assigné à cette caisse
    if caisse and current_user.role == "cashier":
        # Compare by id to avoid cross-session ORM object identity issues
        if not any(u.id == current_user.id for u in caisse.cashiers):
            return None
            
    return caisse


@router.get("", response_model=List[CashRegisterResponse])
def list_cash_registers(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur sans entreprise")

    # Restreindre aux rôles autorisés à gérer/voir la trésorerie
    if current_user.role not in ["admin", "accountant", "super_admin", "cashier"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    query = db.query(CashRegister).filter(CashRegister.company_id == current_user.company_id)
    if current_user.role == "cashier":
        query = query.filter(CashRegister.cashiers.any(id=current_user.id))
        
    return query.order_by(CashRegister.created_at.desc()).all()


@router.post("", response_model=CashRegisterResponse, status_code=status.HTTP_201_CREATED)
def create_cash_register(
    caisse_in: CashRegisterCreateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisateur sans entreprise")

    # Seuls les admins ou super_admins peuvent créer des caisses
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent créer une caisse")

    caisse = CashRegister(
        company_id=current_user.company_id,
        name=caisse_in.name,
        currency=caisse_in.currency or "XOF",
        account_type=caisse_in.account_type or "CASH",
        bank_name=caisse_in.bank_name,
        account_number=caisse_in.account_number,
        accounting_account_id=caisse_in.accounting_account_id,
        current_balance=0.00
    )
    
    if caisse_in.cashier_ids:
        cashiers = db.query(User).filter(User.id.in_(caisse_in.cashier_ids), User.company_id == current_user.company_id, User.role == "cashier").all()
        caisse.cashiers.extend(cashiers)

    db.add(caisse)
    db.commit()
    db.refresh(caisse)
    return caisse


@router.patch("/{caisse_id}", response_model=CashRegisterResponse)
def update_cash_register(
    caisse_id: str,
    caisse_update: CashRegisterUpdateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent modifier une caisse")

    caisse = db.query(CashRegister).filter(
        CashRegister.id == UUID(caisse_id),
        CashRegister.company_id == current_user.company_id
    ).first()
    if not caisse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caisse introuvable")

    update_data = caisse_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(caisse, field, value)

    db.commit()
    db.refresh(caisse)
    return caisse


@router.delete("/{caisse_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_cash_register(
    caisse_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    caisse = db.query(CashRegister).filter(
        CashRegister.id == UUID(caisse_id),
        CashRegister.company_id == current_user.company_id
    ).first()
    if not caisse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caisse introuvable")

    caisse.is_active = False
    db.commit()
    return


@router.put("/{caisse_id}/cashiers", response_model=CashRegisterResponse)
def assign_cashiers(
    caisse_id: str,
    payload: CashRegisterAssignCashiers,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent assigner des caissiers.")
    
    caisse = db.query(CashRegister).filter(
        CashRegister.id == UUID(caisse_id),
        CashRegister.company_id == current_user.company_id
    ).first()
    if not caisse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caisse introuvable")

    cashiers = db.query(User).filter(User.id.in_(payload.cashier_ids), User.company_id == current_user.company_id, User.role == "cashier").all()
    caisse.cashiers = cashiers
    
    db.commit()
    db.refresh(caisse)
    return caisse


@router.get("/{caisse_id}/transactions", response_model=List[CashTransactionResponse])
def list_cash_transactions(
    caisse_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "accountant", "super_admin", "cashier"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    caisse = get_cash_register_for_company(db, caisse_id, current_user)
    if not caisse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caisse introuvable")

    return db.query(CashTransaction).filter(
        CashTransaction.cash_register_id == caisse.id
    ).order_by(CashTransaction.created_at.desc()).all()


@router.post("/{caisse_id}/replenish", response_model=CashTransactionResponse, status_code=status.HTTP_201_CREATED)
def replenish_cash(
    caisse_id: str,
    tx_in: CashTransactionManualCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Seuls les caissiers et admins peuvent alimenter la caisse
    if current_user.role not in ["admin", "super_admin", "cashier"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    caisse = get_cash_register_for_company(db, caisse_id, current_user)
    if not caisse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caisse introuvable")

    # Validation rigoureuse : Exercice comptable actif obligatoire
    active_fy = get_active_fiscal_year(db, current_user.company_id)
    if not active_fy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun exercice comptable actif n'est ouvert pour cette entreprise."
        )

    # Validation rigoureuse : Justificatif obligatoire pour la saisie manuelle de trésorerie
    if not tx_in.attachment_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un justificatif (pièce jointe) est obligatoire pour valider une alimentation manuelle de caisse."
        )

    # Création du Bon d'Entrée
    transaction = CashTransaction(
        cash_register_id=caisse.id,
        type="ENTRY",
        amount=tx_in.amount,
        source=tx_in.source or "replenishment",
        description=tx_in.description or "Alimentation manuelle de caisse",
        created_by=current_user.id,
        attachment_url=tx_in.attachment_url,
        attachment_name=tx_in.attachment_name
    )
    
    # Mise à jour du solde
    caisse.current_balance += tx_in.amount
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.post("/{caisse_id}/withdraw", response_model=CashTransactionResponse, status_code=status.HTTP_201_CREATED)
def withdraw_cash(
    caisse_id: str,
    tx_in: CashTransactionManualCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Seuls les caissiers et admins peuvent faire des retraits de caisse
    if current_user.role not in ["admin", "super_admin", "cashier"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    caisse = get_cash_register_for_company(db, caisse_id, current_user)
    if not caisse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caisse introuvable")

    # Vérification du solde suffisant pour garantir la fiabilité
    if caisse.current_balance < tx_in.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Le solde de la caisse est insuffisant pour effectuer ce retrait."
        )

    # Validation rigoureuse : Exercice comptable actif obligatoire
    active_fy = get_active_fiscal_year(db, current_user.company_id)
    if not active_fy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun exercice comptable actif n'est ouvert pour cette entreprise."
        )

    # Validation rigoureuse : Justificatif obligatoire pour le retrait manuel de trésorerie
    if not tx_in.attachment_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un justificatif (pièce jointe) est obligatoire pour valider ce retrait."
        )

    # Création du Bon de Sortie
    transaction = CashTransaction(
        cash_register_id=caisse.id,
        type="EXIT",
        amount=tx_in.amount,
        source=tx_in.source or "adjustment",
        description=tx_in.description or "Retrait de caisse",
        created_by=current_user.id,
        attachment_url=tx_in.attachment_url,
        attachment_name=tx_in.attachment_name
    )
    
    # Mise à jour du solde
    caisse.current_balance -= tx_in.amount
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


# ─── Gestion des justificatifs de caisse ─────────────────────────────────────

@router.post("/{caisse_id}/upload", response_model=dict)
def upload_cash_justificatif(
    caisse_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload un justificatif de caisse avec vérification d'assignation.
    
    ✅ FIX: Vérifie que le caissier est assigné à la caisse avant de permettre l'upload
    """
    if current_user.role not in ["admin", "super_admin", "cashier"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    
    # ✅ NOUVEAU: Vérifier que le caissier est assigné à la caisse
    caisse = get_cash_register_for_company(db, caisse_id, current_user)
    if not caisse:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Vous n'êtes pas autorisé à téléverser des justificatifs pour cette caisse. Seuls les caissiers assignés peuvent le faire."
        )
    
    upload_dir = Path(settings.uploads_dir)
    file_size = validate_upload(file)
    saved_file_name = save_upload(file, upload_dir)
    file_url = f"/uploads/{saved_file_name}"
    
    return {
        "file_url": file_url,
        "file_name": file.filename
    }


# ─── Gestion des sources personnalisées ─────────────────────────────────────

@router.get("/sources", response_model=List[CashSourceResponse])
def list_cash_sources(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "accountant", "super_admin", "cashier"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    
    # Récupérer les sources personnalisées configurées pour l'entreprise
    sources = db.query(CashSource).filter(
        CashSource.company_id == current_user.company_id,
        CashSource.is_active == True
    ).order_by(CashSource.created_at.asc()).all()

    # Si aucune source personnalisée n'existe encore, on propose des sources par défaut
    if not sources:
        default_names = ["Retrait Banque / Virement", "Remboursement reçu", "Apport de capital", "Vente comptant", "Ajustement / Correction"]
        default_sources = []
        for name in default_names:
            ds = CashSource(
                company_id=current_user.company_id,
                name=name,
                type="BOTH"
            )
            db.add(ds)
            default_sources.append(ds)
        db.commit()
        for ds in default_sources:
            db.refresh(ds)
        return default_sources

    return sources


@router.post("/sources", response_model=CashSourceResponse, status_code=status.HTTP_201_CREATED)
def create_cash_source(
    source_in: CashSourceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé. Réservé aux administrateurs.")
    
    existing = db.query(CashSource).filter(
        CashSource.company_id == current_user.company_id,
        CashSource.name == source_in.name,
        CashSource.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette source existe déjà.")

    source = CashSource(
        company_id=current_user.company_id,
        name=source_in.name,
        type=source_in.type
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cash_source(
    source_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé. Réservé aux administrateurs.")
    
    try:
        source_uuid = UUID(source_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source introuvable")

    source = db.query(CashSource).filter(
        CashSource.id == source_uuid,
        CashSource.company_id == current_user.company_id
    ).first()
    
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source introuvable")

    source.is_active = False
    db.commit()
    return
