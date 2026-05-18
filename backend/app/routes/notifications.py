from typing import List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.notification import Notification, NotificationPreferences
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    UnreadCountResponse,
)
from app.services.notification_service import _get_or_create_prefs

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Liste des notifications de l'utilisateur connecté, de la plus récente à la plus ancienne."""
    query = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return query.all()


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Nombre de notifications non lues de l'utilisateur connecté."""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.read_at == None,  # noqa: E711
        )
        .count()
    )
    return {"count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Marque une notification spécifique comme lue."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification introuvable")

    if notif.read_at is None:
        notif.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notif)

    return notif


@router.post("/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Marque toutes les notifications non lues comme lues."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_at == None,  # noqa: E711
    ).update({"read_at": datetime.utcnow()})
    db.commit()
    return {"message": "Toutes les notifications ont été marquées comme lues"}


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Récupère les préférences de notification de l'utilisateur."""
    return _get_or_create_prefs(db, current_user.id)


@router.patch("/preferences", response_model=NotificationPreferencesResponse)
def update_preferences(
    update_data: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Met à jour les préférences de notification de l'utilisateur."""
    prefs = _get_or_create_prefs(db, current_user.id)

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(prefs, field, value)

    db.commit()
    db.refresh(prefs)
    return prefs


@router.post("/trigger-reminders")
def trigger_reminders(
    days: int = Query(3, ge=1),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Déclenche manuellement les rappels pour les bons en attente depuis `days` jours.
    Seuls les managers et administrateurs peuvent lancer cette action.
    """
    if current_user.role not in ["manager", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
        
    from app.utils.reminders import send_pending_reminders
    count = send_pending_reminders(db, days_threshold=days)
    return {"message": f"Job terminé. {count} rappels envoyés avec succès."}

