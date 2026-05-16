from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.invitation import Invitation
from app.models.user import User
from app.schemas.invitation import InvitationCreateSchema, InvitationResponse
from app.services.tenant import get_invitation_for_company, list_invitations_for_company

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.post("", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    invitation_in: InvitationCreateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Entreprise requise pour envoyer une invitation")

    token = uuid.uuid4().hex
    expires_at = datetime.utcnow() + timedelta(days=7)

    invitation = Invitation(
        company_id=current_user.company_id,
        email=invitation_in.email,
        role=invitation_in.role,
        token=token,
        invited_by_id=current_user.id,
        expires_at=expires_at,
    )

    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.get("", response_model=list[InvitationResponse])
def list_invitations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    invitations = list_invitations_for_company(db, current_user)
    return invitations


@router.delete("/{invitation_id}", response_model=InvitationResponse)
def cancel_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    invitation = get_invitation_for_company(db, invitation_id, current_user)
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation non trouvée")

    invitation.status = "cancelled"
    db.commit()
    db.refresh(invitation)
    return invitation
