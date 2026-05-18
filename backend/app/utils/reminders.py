from datetime import datetime, timedelta
import logging
from sqlalchemy.orm import Session
from app.models.expense import ExpenseRequest, ExpenseStatus
from app.models.user import User
from app.services.notification_service import notify

logger = logging.getLogger(__name__)


def send_pending_reminders(db: Session, days_threshold: int = 3) -> int:
    """
    Envoie un rappel aux managers pour tous les bons en attente depuis plus de `days_threshold` jours.
    Retourne le nombre total de notifications envoyées.
    """
    limit_date = datetime.utcnow() - timedelta(days=days_threshold)
    
    # Récupérer les bons en attente soumis avant limit_date
    pending_expenses = (
        db.query(ExpenseRequest)
        .filter(
            ExpenseRequest.status == ExpenseStatus.pending.value,
            ExpenseRequest.submitted_at <= limit_date
        )
        .all()
    )
    
    notifications_sent = 0
    
    for expense in pending_expenses:
        # Trouver les managers et admins de la même entreprise
        managers = (
            db.query(User)
            .filter(
                User.company_id == expense.company_id,
                User.role.in_(["manager", "admin"]),
                User.is_active == True
            )
            .all()
        )
        
        amount = float(expense.amount)
        currency = expense.currency
        submitter_name = expense.user.name if expense.user else "Un employé"
        
        # Calculer le nombre exact de jours d'attente
        delta_days = (datetime.utcnow() - expense.submitted_at).days if expense.submitted_at else days_threshold
        
        for manager in managers:
            try:
                notify(
                    db=db,
                    company_id=expense.company_id,
                    user_id=manager.id,
                    notif_type="reminder",
                    title="⚠️ Rappel : Bon en attente de validation",
                    message=f"Le bon de {submitter_name} ({amount:,.0f} {currency}) attend votre validation depuis {delta_days} jours.",
                    link=f"/dashboard/expenses/{expense.id}",
                    pref_key="notify_on_created" # On réutilise la pref de création/action de validation
                )
                notifications_sent += 1
            except Exception as e:
                logger.error(f"Failed to notify manager {manager.id} for reminder on expense {expense.id}: {e}")
                
    return notifications_sent
