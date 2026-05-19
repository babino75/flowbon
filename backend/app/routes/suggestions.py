from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.models.suggestion import Suggestion
from app.schemas.suggestion import SuggestionCreate, SuggestionUpdate, SuggestionResponse

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.post("", response_model=SuggestionResponse, status_code=status.HTTP_201_CREATED)
def create_suggestion(
    suggestion_in: SuggestionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Ensure correct company_id is populated from current user
    suggestion = Suggestion(
        company_id=current_user.company_id,
        user_id=current_user.id,
        title=suggestion_in.title,
        content=suggestion_in.content,
        category=suggestion_in.category,
        is_anonymous=suggestion_in.is_anonymous,
        status="pending"
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)

    res = SuggestionResponse.model_validate(suggestion)
    res.user_name = "Anonyme" if suggestion.is_anonymous else current_user.name
    if suggestion.is_anonymous:
        res.user_id = None
    return res


@router.get("", response_model=List[SuggestionResponse])
def list_suggestions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Suggestion)

    # Multi-tenant security based on roles
    if current_user.role == "super_admin":
        suggestions = query.all()
    elif current_user.role == "admin":
        suggestions = query.filter(Suggestion.company_id == current_user.company_id).all()
    else:
        suggestions = query.filter(Suggestion.user_id == current_user.id).all()

    results = []
    for s in suggestions:
        res = SuggestionResponse.model_validate(s)
        # Anonymization logic:
        # Hide author name/id from ordinary users & company admins if is_anonymous is True.
        # Only super_admin sees actual name for support/moderation.
        if s.is_anonymous:
            if current_user.role == "super_admin":
                res.user_name = f"{s.user.name} (Anonyme)" if s.user else "Utilisateur Supprimé"
            else:
                res.user_name = "Anonyme"
                res.user_id = None
        else:
            res.user_name = s.user.name if s.user else "Utilisateur Supprimé"
        results.append(res)

    return results


@router.get("/{suggestion_id}", response_model=SuggestionResponse)
def get_suggestion(
    suggestion_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    suggestion = db.query(Suggestion).filter(Suggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion non trouvée")

    # Security check:
    if current_user.role != "super_admin":
        if current_user.role == "admin":
            if suggestion.company_id != current_user.company_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit")
        else:
            if suggestion.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit")

    res = SuggestionResponse.model_validate(suggestion)
    if suggestion.is_anonymous:
        if current_user.role == "super_admin":
            res.user_name = f"{suggestion.user.name} (Anonyme)" if suggestion.user else "Utilisateur Supprimé"
        else:
            res.user_name = "Anonyme"
            res.user_id = None
    else:
        res.user_name = suggestion.user.name if suggestion.user else "Utilisateur Supprimé"

    return res


@router.patch("/{suggestion_id}", response_model=SuggestionResponse)
def update_suggestion(
    suggestion_id: str,
    suggestion_update: SuggestionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    suggestion = db.query(Suggestion).filter(Suggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion non trouvée")

    # Only admins or super admins can moderate suggestions
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    if current_user.role == "admin" and suggestion.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit")

    if suggestion_update.status is not None:
        suggestion.status = suggestion_update.status
    if suggestion_update.admin_response is not None:
        suggestion.admin_response = suggestion_update.admin_response

    db.commit()
    db.refresh(suggestion)

    res = SuggestionResponse.model_validate(suggestion)
    if suggestion.is_anonymous:
        if current_user.role == "super_admin":
            res.user_name = f"{suggestion.user.name} (Anonyme)" if suggestion.user else "Utilisateur Supprimé"
        else:
            res.user_name = "Anonyme"
            res.user_id = None
    else:
        res.user_name = suggestion.user.name if suggestion.user else "Utilisateur Supprimé"

    return res


@router.delete("/{suggestion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suggestion(
    suggestion_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    suggestion = db.query(Suggestion).filter(Suggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion non trouvée")

    if current_user.role == "super_admin":
        pass
    elif current_user.role == "admin":
        if suggestion.company_id != current_user.company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit")
    else:
        if suggestion.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit")
        # Standard users can only delete suggestions in pending state
        if suggestion.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de supprimer une suggestion déjà prise en compte par l'administration"
            )

    db.delete(suggestion)
    db.commit()
    return None
