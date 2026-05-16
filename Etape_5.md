# ETAPE 5 - WORKFLOW DE VALIDATION

Objectif : digitaliser le circuit Employe -> Manager -> Comptable -> Paiement.

C'est ici que FlowBon remplace vraiment les validations papier.

---

# 1. Objectif produit

Chaque bon doit suivre un processus clair et trace :

```text
Employe cree le bon (draft ou pending)
Manager approuve ou refuse (avec commentaire)
Comptable marque comme paye
Historique complet conserve
```

---

# 2. Regles metier MVP

- un employe peut creer un bon
- un employe peut annuler un bon `draft` ou `pending`
- un manager peut approuver ou refuser un bon `pending`
- un manager DOIT laisser un commentaire quand il refuse un bon
- un comptable peut marquer un bon `approved` comme `paid`
- un admin peut voir tout l'historique
- chaque action doit etre tracee avec l'auteur, la date et le commentaire
- personne ne peut approuver son propre bon (anti-fraude)

## Regle anti-fraude

```python
def can_approve(approver: User, expense: ExpenseRequest) -> bool:
    """Un utilisateur ne peut pas approuver son propre bon."""
    if approver.id == expense.user_id:
        raise HTTPException(403, "Vous ne pouvez pas approuver votre propre bon.")
    if approver.role not in ["manager", "admin"]:
        raise HTTPException(403, "Seuls les managers et admins peuvent approuver.")
    return True
```

---

# 3. Backend

## Table d'historique

```text
approval_logs
 - id (UUID)
 - company_id (FK -> companies)
 - expense_request_id (FK -> expense_requests)
 - user_id (FK -> users, celui qui fait l'action)
 - action (enum)
 - comment (text, obligatoire si action = rejected)
 - created_at
```

## Actions possibles

```text
created       → employe a cree le bon
submitted     → employe a soumis le brouillon
approved      → manager a approuve
rejected      → manager a refuse (commentaire obligatoire)
paid          → comptable a marque comme paye
cancelled     → employe a annule
commented     → quelqu'un a ajoute un commentaire
```

## Routes API

```text
POST /expenses/{id}/approve       → manager approuve (status -> approved)
POST /expenses/{id}/reject        → manager refuse (status -> rejected, commentaire obligatoire)
POST /expenses/{id}/mark-as-paid  → comptable marque comme paye (status -> paid)
POST /expenses/{id}/comment       → ajouter un commentaire sans changer le statut
GET  /expenses/{id}/logs          → historique complet du bon
```

## Schema de validation pour le refus

```python
class RejectSchema(BaseModel):
    comment: str

    @validator("comment")
    def comment_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Un commentaire est obligatoire pour refuser un bon.")
        return v.strip()
```

## Transitions de statut autorisees

```text
draft     -> pending    (par l'employe : soumettre)
draft     -> cancelled  (par l'employe : annuler)
pending   -> approved   (par le manager : approuver)
pending   -> rejected   (par le manager : refuser)
pending   -> cancelled  (par l'employe : annuler)
approved  -> paid       (par le comptable : marquer comme paye)
rejected  -> pending    (par l'employe : resoumettre apres correction)
```

Toute autre transition doit etre refusee par le backend.

---

# 4. Frontend

## Vues minimum

```text
/dashboard/approvals          → bons en attente de validation (pour managers)
/dashboard/payments           → bons approuves a payer (pour comptables)
/dashboard/expenses/[id]      → detail du bon avec historique
```

## Actions minimum

- manager voit les bons en attente de son entreprise
- manager approuve avec un clic (+ confirmation)
- manager refuse avec commentaire obligatoire (textarea)
- comptable voit les bons approuves
- comptable marque comme paye (+ confirmation)
- employe voit l'historique complet de son bon
- employe peut resoumettre un bon refuse apres correction
- tous les acteurs voient la timeline du bon (qui a fait quoi et quand)

## Timeline visuelle du bon

Afficher une timeline claire sur la page detail :

```text
📝 12/03/2025 10:30 — Employe Moussa a cree le bon
📤 12/03/2025 10:35 — Employe Moussa a soumis le bon
✅ 13/03/2025 09:00 — Manager Fatou a approuve
💳 14/03/2025 14:00 — Comptable Ali a marque comme paye
```

Ou en cas de refus :

```text
📝 12/03/2025 10:30 — Employe Moussa a cree le bon
📤 12/03/2025 10:35 — Employe Moussa a soumis le bon
❌ 13/03/2025 09:00 — Manager Fatou a refuse
   💬 "La facture n'est pas lisible, merci de renvoyer une meilleure photo."
📤 13/03/2025 11:00 — Employe Moussa a resoumis le bon
✅ 13/03/2025 15:00 — Manager Fatou a approuve
```

---

# 5. Checkpoint

A la fin de cette etape :

```text
OK - le workflow principal fonctionne (pending -> approved -> paid)
OK - chaque role a ses actions specifiques
OK - un manager DOIT commenter quand il refuse
OK - personne ne peut approuver son propre bon
OK - un employe peut annuler un bon en attente
OK - un employe peut resoumettre un bon refuse
OK - l'historique complet est visible sous forme de timeline
OK - les transitions de statut invalides sont refusees par le backend
OK - on peut faire une premiere demo a une entreprise
```

Quand c'est termine, on passe a :

# ETAPE 6 - DASHBOARD ET RAPPORTS
