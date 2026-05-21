"""
Service centralisé de notifications pour FlowBon.
Gère les notifications in-app et les emails via Resend (Prod) ou SMTP / Maildev (Dev).
"""
import os
import uuid
import logging
import smtplib
from datetime import datetime
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sqlalchemy.orm import Session

from app.config import settings
from app.models.notification import Notification, NotificationPreferences
from app.models.user import User

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
APP_ENV = os.getenv("APP_ENV", "local")

# Initialise le client Resend si la clé est présente
if RESEND_API_KEY:
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        logger.info("✅ Resend email client initialized")
    except ImportError:
        logger.warning("⚠️  resend package not installed, emails disabled")
        RESEND_API_KEY = ""


def _get_or_create_prefs(db: Session, user_id) -> NotificationPreferences:
    """Récupère ou crée les préférences de notification d'un utilisateur."""
    prefs = db.query(NotificationPreferences).filter(
        NotificationPreferences.user_id == user_id
    ).first()
    if not prefs:
        prefs = NotificationPreferences(
            id=uuid.uuid4(),
            user_id=user_id,
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


def _create_in_app(
    db: Session,
    company_id,
    user_id,
    notif_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
):
    """Crée une notification in-app dans la base de données."""
    notif = Notification(
        id=uuid.uuid4(),
        company_id=company_id,
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        link=link,
    )
    db.add(notif)
    db.commit()


def _send_email_smtp(user_email: str, title: str, html_body: str) -> bool:
    """Envoie un email via SMTP standard (par exemple Maildev ou Gmail)."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[FlowBon] {title}"
        msg["From"] = SMTP_USER if SMTP_USER else FROM_EMAIL
        msg["To"] = user_email

        part = MIMEText(html_body, "html")
        msg.attach(part)

        # Si le port est 465, on utilise SSL
        if SMTP_PORT == 465:
            server_class = smtplib.SMTP_SSL
        else:
            server_class = smtplib.SMTP

        with server_class(SMTP_HOST, SMTP_PORT, timeout=10.0) as server:
            server.ehlo()
            # Si le port est 587, on utilise TLS
            if SMTP_PORT == 587:
                server.starttls()
                server.ehlo()
            
            # Authentification si credentials fournis
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)

            from_addr = SMTP_USER if SMTP_USER else FROM_EMAIL
            server.sendmail(from_addr, [user_email], msg.as_string())
            
        logger.info(f"✅ Email sent via SMTP to {user_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to send email via SMTP to {user_email}: {e}")
        return False




def _send_email(user_email: str, user_name: str, title: str, message: str, link: Optional[str]):
    """Envoie un email via le SDK officiel Resend (Prod) ou SMTP Maildev (Dev)."""
    link_html = ""
    if link:
        full_link = f"{settings.frontend_url}{link}"
        link_html = f"""
        <p style="margin-top:24px">
          <a href="{full_link}"
             style="display:inline-block;padding:12px 28px;background:#4f46e5;color:white;
                    text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px">
            👉 Voir le bon
          </a>
        </p>"""

    html_body = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
      <div style="background:white;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="margin-bottom:20px">
          <span style="font-size:24px;font-weight:900;background:linear-gradient(to right,#4f46e5,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent">FlowBon</span>
        </div>
        <h2 style="color:#1e1b4b;margin:0 0 12px 0;font-size:18px">{title}</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0">{message}</p>
        {link_html}
      </div>
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px">
        FlowBon — Gestion des dépenses simplifiée<br>
        Vous recevez cet email car vous avez un compte FlowBon.
      </p>
    </div>
    """

    # 1. En environnement de prod, on essaie Resend si disponible
    if RESEND_API_KEY and APP_ENV == "production":
        try:
            import resend
            params = {
                "from": FROM_EMAIL,
                "to": [user_email],
                "subject": f"[FlowBon] {title}",
                "html": html_body,
            }
            resend.Emails.send(params)
            logger.info(f"✅ Email sent via Resend to {user_email}")
            return
        except Exception as e:
            logger.warning(f"⚠️  Resend failed (falling back to SMTP): {e}")

    # 2. Sinon, on utilise le fallback SMTP (Maildev en local)
    if SMTP_HOST:
        if _send_email_smtp(user_email, title, html_body):
            return

    # 3. Sinon, simple log console
    logger.info(f"[EMAIL CONSOLE] To: {user_email} | Subject: {title} | Msg: {message}")



def notify(
    db: Session,
    company_id,
    user_id,
    notif_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    pref_key: Optional[str] = None,
):
    """
    Envoie une notification in-app ET par email selon les préférences de l'utilisateur.
    pref_key: clé de préférence (notify_on_created, notify_on_approved, etc.)
    """
    try:
        prefs = _get_or_create_prefs(db, user_id)

        # Si pref_key est fourni, vérifier si l'utilisateur veut recevoir ce type
        if pref_key:
            wants_this_type = getattr(prefs, pref_key, True)
            if not wants_this_type:
                return

        if prefs.notify_in_app:
            _create_in_app(db, company_id, user_id, notif_type, title, message, link)

        if prefs.notify_email:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                _send_email(user.email, user.name, title, message, link)

    except Exception as e:
        logger.error(f"notify() failed for user {user_id}: {e}")


def on_expense_submitted(db: Session, expense, submitter: User):
    """Notifie en priorité les managers quand un employé soumet un bon. Si aucun manager n'existe, notifie l'admin."""
    # D'abord, on cherche s'il y a des managers
    managers = db.query(User).filter(
        User.company_id == expense.company_id,
        User.role == "manager",
        User.is_active == True,
    ).all()
    
    # S'il n'y a aucun manager, on alerte les admins
    if not managers:
        managers = db.query(User).filter(
            User.company_id == expense.company_id,
            User.role.in_(["admin", "super_admin"]),
            User.is_active == True,
        ).all()

    amount = float(expense.amount)
    currency = expense.currency

    for manager in managers:
        notify(
            db=db,
            company_id=expense.company_id,
            user_id=manager.id,
            notif_type="expense_created",
            title="Nouveau bon de dépense à valider",
            message=f"{submitter.name} a soumis un bon de {amount:,.0f} {currency}.",
            link=f"/dashboard/expenses/{expense.id}",
            pref_key="notify_on_created",
        )


def on_expense_approved(db: Session, expense, approver: User):
    """Notifie l'employé que son bon est approuvé."""
    amount = float(expense.amount)
    currency = expense.currency

    notify(
        db=db,
        company_id=expense.company_id,
        user_id=expense.user_id,
        notif_type="expense_approved",
        title="Bon de dépense approuvé ✅",
        message=f"Votre bon de {amount:,.0f} {currency} a été approuvé par {approver.name}.",
        link=f"/dashboard/expenses/{expense.id}",
        pref_key="notify_on_approved",
    )

    # Notifier aussi les comptables
    accountants = db.query(User).filter(
        User.company_id == expense.company_id,
        User.role == "accountant",
        User.is_active == True,
    ).all()
    for accountant in accountants:
        notify(
            db=db,
            company_id=expense.company_id,
            user_id=accountant.id,
            notif_type="expense_approved",
            title="Nouveau bon à payer",
            message=f"Un bon de {amount:,.0f} {currency} de {expense.user.name} est prêt à être payé.",
            link=f"/dashboard/expenses/{expense.id}",
            pref_key="notify_on_approved",
        )


def on_expense_rejected(db: Session, expense, rejector: User, comment: Optional[str] = None):
    """Notifie l'employé que son bon est refusé avec la raison. Notifie aussi le manager si le refus vient d'en haut."""
    amount = float(expense.amount)
    currency = expense.currency
    reason = f" Motif : {comment}" if comment else ""

    # Notifier l'employé qui a soumis le bon
    notify(
        db=db,
        company_id=expense.company_id,
        user_id=expense.user_id,
        notif_type="expense_rejected",
        title="Bon de dépense refusé ❌",
        message=f"Votre bon de {amount:,.0f} {currency} a été refusé par {rejector.name}.{reason}",
        link=f"/dashboard/expenses/{expense.id}",
        pref_key="notify_on_rejected",
    )

    # Si le rejet a été fait par le comptable, le caissier ou l'admin, on veut informer le manager qui avait validé
    if rejector.role in ["accountant", "cashier", "admin", "super_admin"]:
        from app.models.approval_log import ApprovalLog
        # Trouver le log d'approbation (manager)
        approval_log = db.query(ApprovalLog).filter(
            ApprovalLog.expense_request_id == expense.id,
            ApprovalLog.action == "approved"
        ).order_by(ApprovalLog.created_at.desc()).first()
        
        if approval_log:
            manager = db.query(User).filter(User.id == approval_log.user_id).first()
            if manager and manager.id != rejector.id:
                notify(
                    db=db,
                    company_id=expense.company_id,
                    user_id=manager.id,
                    notif_type="expense_rejected",
                    title="Bon que vous avez validé refusé ❌",
                    message=f"Le bon de {amount:,.0f} {currency} (soumis par {expense.user.name}) que vous aviez validé a été finalement refusé par {rejector.name}.{reason}",
                    link=f"/dashboard/expenses/{expense.id}",
                    pref_key="notify_on_rejected",
                )


def on_expense_paid(db: Session, expense, payer: User):
    """Notifie l'employé que son bon est payé."""
    amount = float(expense.amount)
    currency = expense.currency

    notify(
        db=db,
        company_id=expense.company_id,
        user_id=expense.user_id,
        notif_type="expense_paid",
        title="Remboursement effectué 💸",
        message=f"Votre bon de {amount:,.0f} {currency} a été payé par {payer.name}.",
        link=f"/dashboard/expenses/{expense.id}",
        pref_key="notify_on_paid",
    )


def on_expense_approved_accounting(db: Session, expense, accountant: User):
    """Notifie l'employé et les caissiers que le bon a été visé et approuvé financièrement."""
    amount = float(expense.amount)
    currency = expense.currency

    # Notifier l'employé
    notify(
        db=db,
        company_id=expense.company_id,
        user_id=expense.user_id,
        notif_type="expense_approved_accounting",
        title="Bon de dépense visé par la comptabilité 🧾",
        message=f"Votre bon de {amount:,.0f} {currency} a été validé financièrement par {accountant.name} et est en attente de décaissement par la caisse.",
        link=f"/dashboard/expenses/{expense.id}",
        pref_key="notify_on_approved",
    )

    # Notifier les caissiers
    cashiers = db.query(User).filter(
        User.company_id == expense.company_id,
        User.role == "cashier",
        User.is_active == True,
    ).all()
    for cashier in cashiers:
        notify(
            db=db,
            company_id=expense.company_id,
            user_id=cashier.id,
            notif_type="expense_approved_accounting",
            title="Nouveau décaissement en attente 💵",
            message=f"Un bon de {amount:,.0f} {currency} soumis par {expense.user.name} a été visé par la comptabilité et est prêt pour le décaissement.",
            link=f"/dashboard/expenses/{expense.id}",
            pref_key="notify_on_approved",
        )


def send_password_reset_email(user_email: str, token: str) -> bool:
    """Envoie un email de réinitialisation de mot de passe."""
    reset_link = f"{settings.frontend_url}/reset-password?token={token}"
    title = "Réinitialisation de votre mot de passe"
    html_body = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
      <div style="background:white;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="margin-bottom:20px">
          <span style="font-size:24px;font-weight:900;background:linear-gradient(to right,#4f46e5,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent">FlowBon</span>
        </div>
        <h2 style="color:#1e1b4b;margin:0 0 12px 0;font-size:18px">{title}</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0">
          Vous avez demandé la réinitialisation du mot de passe de votre compte FlowBon. 
          Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe (ce lien expire dans 1 heure) :
        </p>
        <p style="margin-top:24px">
          <a href="{reset_link}"
             style="display:inline-block;padding:12px 28px;background:#4f46e5;color:white;
                    text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px">
            🔑 Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;margin-top:20px">
          Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail en toute sécurité.
        </p>
      </div>
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px">
        FlowBon — Gestion des dépenses simplifiée
      </p>
    </div>
    """
    
    # 1. Resend en prod
    if RESEND_API_KEY and APP_ENV == "production":
        try:
            import resend
            params = {
                "from": FROM_EMAIL,
                "to": [user_email],
                "subject": f"[FlowBon] {title}",
                "html": html_body,
            }
            resend.Emails.send(params)
            logger.info(f"✅ Password reset email sent via Resend to {user_email}")
            return True
        except Exception as e:
            logger.warning(f"⚠️  Resend reset email failed: {e}")
            
    # 2. SMTP fallback
    if SMTP_HOST:
        return _send_email_smtp(user_email, title, html_body)
        
    # 3. Console log
    logger.info(f"[RESET EMAIL CONSOLE] To: {user_email} | Link: {reset_link}")
    return True


def send_invitation_email(user_email: str, company_name: str, inviter_name: str, role: str, token: str) -> bool:
    """Envoie un email d'invitation à rejoindre une entreprise."""
    invite_link = f"{settings.frontend_url}/register-invite?token={token}"
    role_fr = {
        "admin": "Administrateur",
        "manager": "Manager",
        "accountant": "Comptable",
        "cashier": "Caissier",
        "employee": "Employé"
    }.get(role, role)

    title = f"Invitation à rejoindre {company_name}"
    html_body = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
      <div style="background:white;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="margin-bottom:20px">
          <span style="font-size:24px;font-weight:900;background:linear-gradient(to right,#4f46e5,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent">FlowBon</span>
        </div>
        <h2 style="color:#1e1b4b;margin:0 0 12px 0;font-size:18px">{{title}}</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0">
          Bonjour,<br/><br/>
          <b>{{inviter_name}}</b> vous invite à rejoindre l'espace de travail de l'entreprise <b>{{company_name}}</b> sur FlowBon, en tant que <b>{{role_fr}}</b>.
        </p>
        <p style="margin-top:24px">
          <a href="{{invite_link}}"
             style="display:inline-block;padding:12px 28px;background:#4f46e5;color:white;
                    text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px">
            ✨ Accepter l'invitation
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;margin-top:20px">
          Ce lien est valable pour une durée de 7 jours. Si vous ne connaissez pas l'expéditeur, ignorez ce message.
        </p>
      </div>
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px">
        FlowBon — Gestion des dépenses simplifiée
      </p>
    </div>
    """
    
    # 1. Resend en prod
    if RESEND_API_KEY and APP_ENV == "production":
        try:
            import resend
            params = {
                "from": FROM_EMAIL,
                "to": [user_email],
                "subject": f"[FlowBon] {title}",
                "html": html_body,
            }
            resend.Emails.send(params)
            logger.info(f"✅ Invitation email sent via Resend to {user_email}")
            return True
        except Exception as e:
            logger.warning(f"⚠️  Resend invitation email failed: {e}")
            
    # 2. SMTP fallback
    if SMTP_HOST:
        return _send_email_smtp(user_email, title, html_body)
        
    # 3. Console log
    logger.info(f"[INVITE EMAIL CONSOLE] To: {user_email} | Link: {invite_link}")
    return True

