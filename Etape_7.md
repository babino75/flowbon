# ETAPE 7 - NOTIFICATIONS ET EXPERIENCE UTILISATEUR

Objectif : rendre FlowBon fluide dans la vraie vie.

Une entreprise n'utilisera pas FlowBon longtemps si les gens oublient de valider les bons. Les notifications rendent le workflow vivant.

---

# 1. Objectif produit

Informer automatiquement les bonnes personnes quand une action importante arrive.

Exemples :

- un employe cree un bon → notifier le manager
- un manager valide → notifier l'employe et le comptable
- un manager refuse → notifier l'employe avec la raison
- un comptable marque comme paye → notifier l'employe
- un bon est en attente depuis 3 jours → rappeler le manager

---

# 2. Types de notifications

## Notifications in-app (MVP)

Notifications visibles directement dans l'interface FlowBon :

- icone cloche avec badge (nombre de non-lues)
- liste deroulante des notifications recentes
- clic sur une notification → redirection vers le bon concerne

## Notifications email (MVP)

Emails envoyes automatiquement. Fournisseur recommande pour le MVP :

```text
Option 1 : Resend (gratuit jusqu'a 3000 emails/mois, simple a integrer)
Option 2 : SendGrid (gratuit jusqu'a 100 emails/jour)
Option 3 : SMTP Gmail (gratuit mais limite, pas ideal en production)
```

Recommandation : commencer avec Resend. Simple, fiable, et le tier gratuit suffit largement pour les premiers clients.

## Notifications futures (post-MVP)

- WhatsApp Business API
- SMS (Twilio ou services locaux)
- rappels automatiques programmables

---

# 3. Backend

## Table principale

```text
notifications
 - id (UUID)
 - company_id (FK -> companies)
 - user_id (FK -> users, le destinataire)
 - type (enum: expense_created, expense_approved, expense_rejected, expense_paid, reminder)
 - title
 - message
 - link (URL vers le bon concerne, ex: /dashboard/expenses/123)
 - read_at (nullable, null = non lue)
 - created_at
```

## Table de preferences (optionnel MVP, recommande)

```text
notification_preferences
 - id
 - user_id (FK -> users)
 - notify_in_app (boolean, defaut true)
 - notify_email (boolean, defaut true)
 - notify_on_created (boolean, defaut true)
 - notify_on_approved (boolean, defaut true)
 - notify_on_rejected (boolean, defaut true)
 - notify_on_paid (boolean, defaut true)
```

Permet a chaque utilisateur de choisir quelles notifications il recoit. Certains managers ne veulent pas recevoir d'email a chaque bon cree.

## Routes API

```text
GET    /notifications              → liste de mes notifications (paginee)
GET    /notifications/unread-count → nombre de notifications non lues
POST   /notifications/{id}/read   → marquer une notification comme lue
POST   /notifications/read-all    → marquer toutes comme lues
GET    /notifications/preferences  → voir mes preferences
PATCH  /notifications/preferences  → modifier mes preferences
```

## Service de notification centralise

Creer un service qui envoie les notifications de maniere uniforme :

```python
# services/notification_service.py

class NotificationService:
    
    def notify(self, user_id, type, title, message, link):
        """Envoie une notification in-app ET par email selon les preferences."""
        
        prefs = get_user_preferences(user_id)
        
        if prefs.notify_in_app:
            create_in_app_notification(user_id, type, title, message, link)
        
        if prefs.notify_email:
            send_email_notification(user_id, title, message, link)
    
    def on_expense_created(self, expense):
        """Notifie les managers quand un employe cree un bon."""
        managers = get_company_managers(expense.company_id)
        for manager in managers:
            self.notify(
                manager.id,
                "expense_created",
                "Nouveau bon de depense",
                f"{expense.user.name} a soumis un bon de {expense.amount} {expense.currency}",
                f"/dashboard/expenses/{expense.id}"
            )
    
    def on_expense_approved(self, expense):
        """Notifie l'employe et les comptables."""
        ...
    
    def on_expense_rejected(self, expense, comment):
        """Notifie l'employe avec la raison du refus."""
        ...
    
    def on_expense_paid(self, expense):
        """Notifie l'employe que son bon est paye."""
        ...
```

## Rappels automatiques

Creer un job periodique (cron ou tache planifiee) qui detecte les bons en attente depuis trop longtemps :

```python
# utils/reminders.py

def send_pending_reminders():
    """Envoie un rappel aux managers pour les bons en attente depuis plus de 3 jours."""
    
    three_days_ago = datetime.now() - timedelta(days=3)
    pending_expenses = get_expenses_pending_before(three_days_ago)
    
    for expense in pending_expenses:
        managers = get_company_managers(expense.company_id)
        for manager in managers:
            notify(
                manager.id,
                "reminder",
                "Rappel : bon en attente",
                f"Le bon de {expense.user.name} attend votre validation depuis {days} jours.",
                f"/dashboard/expenses/{expense.id}"
            )
```

En MVP, ce job peut etre lance manuellement ou via un cron simple. En production, utiliser Celery ou APScheduler.

---

# 4. Frontend

## Elements minimum

- icone cloche dans la barre de navigation du dashboard
- badge rouge avec le nombre de notifications non lues
- dropdown qui affiche les 10 dernieres notifications
- lien "Voir toutes les notifications"
- page `/dashboard/notifications` avec la liste complete
- clic sur une notification → marque comme lue + redirige vers le bon
- page de preferences de notification dans les parametres du profil

## Templates email

Creer des templates email simples et professionnels :

```text
Sujet : [FlowBon] Nouveau bon de depense a valider

Bonjour {manager_name},

{employee_name} a soumis un bon de depense :
- Montant : {amount} {currency}
- Categorie : {category}
- Description : {description}

👉 Voir le bon : {link}

---
FlowBon - Gestion des depenses simplifiee
```

---

# 5. Checkpoint

A la fin de cette etape :

```text
OK - les notifications in-app fonctionnent (icone cloche + badge + liste)
OK - les emails sont envoyes automatiquement via Resend ou SendGrid
OK - chaque action importante declenche une notification
OK - les utilisateurs peuvent configurer leurs preferences de notification
OK - les templates email sont professionnels et clairs
OK - un systeme de rappel existe pour les bons en attente
OK - FlowBon ressemble davantage a un vrai produit SaaS
```

Quand c'est termine, on passe a :

# ETAPE 8 - DEMO COMMERCIALE ET LANCEMENT LOCAL
