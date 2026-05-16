# ETAPE 3 - ENTREPRISES ET MODE SAAS

Objectif : faire de FlowBon un vrai SaaS multi-entreprise avec isolation securisee des donnees.

Sans cette etape, FlowBon reste une app pour une seule organisation. Avec cette etape, plusieurs entreprises locales peuvent utiliser la meme plateforme sans melanger leurs donnees.

---

# 1. Objectif produit

Chaque client doit avoir son propre espace entreprise.

Exemple :

```text
Entreprise A voit uniquement ses employes et ses bons.
Entreprise B voit uniquement ses employes et ses bons.
Jamais de melange, jamais de fuite de donnees.
```

---

# 2. Fonctionnalites a construire

- creation d'une entreprise pendant l'inscription admin
- rattachement de chaque utilisateur a une entreprise
- isolation securisee des donnees par `company_id`
- invitation d'employes par email (lien d'inscription pre-rempli)
- creation manuelle d'employes par l'admin
- desactivation d'un utilisateur (sans supprimer ses donnees)
- role `super_admin` (proprietaire du SaaS, pas visible pour les clients)

---

# 3. Roles dans le systeme

Deux niveaux de roles :

```text
Niveau SaaS (invisible pour les clients) :
 - super_admin : toi, le proprietaire de FlowBon. Peut voir toutes les entreprises.

Niveau Entreprise (visible pour les clients) :
 - admin : administrateur de l'entreprise
 - manager : responsable d'equipe
 - accountant : comptable
 - employee : employe standard
```

Le `super_admin` est utile pour :
- voir les statistiques globales du SaaS
- gerer les abonnements
- intervenir en cas de probleme chez un client
- desactiver une entreprise

---

# 4. Backend

## Tables principales

```text
companies
 - id (UUID)
 - name
 - country
 - city
 - phone
 - email
 - subscription_plan (free, starter, business, enterprise)
 - subscription_status (active, expired, cancelled)
 - max_users (limite selon le plan)
 - created_at
 - updated_at

users
 - id (UUID)
 - company_id (FK -> companies)
 - name
 - email
 - password_hash
 - role (admin, manager, accountant, employee)
 - is_active (boolean, defaut true)
 - invited_by (FK -> users, nullable)
 - created_at
 - updated_at
```

## Isolation multi-tenant

C'est le point le plus critique de cette etape.

Chaque requete API qui touche des donnees d'entreprise doit etre filtree par l'entreprise de l'utilisateur connecte.

Attention : un middleware HTTP ne filtre pas automatiquement les requetes SQL. Il faut donc centraliser les acces base de donnees dans des fonctions de service ou de repository qui exigent toujours `company_id`.

```python
# services/tenant_scope.py

def get_current_company_id(current_user: User) -> int:
    """Retourne le company_id de l'utilisateur connecte.
    Toutes les fonctions metier doivent utiliser ce filtre."""
    return current_user.company_id

def get_expense_for_company(db, expense_id, company_id):
    """Retourne un bon seulement s'il appartient a l'entreprise courante."""
    return (
        db.query(ExpenseRequest)
        .filter(
            ExpenseRequest.id == expense_id,
            ExpenseRequest.company_id == company_id,
        )
        .first()
    )

def list_expenses_for_company(db, company_id, filters):
    """Liste les bons visibles pour une entreprise."""
    query = db.query(ExpenseRequest).filter(ExpenseRequest.company_id == company_id)
    # appliquer ici les filtres status, periode, categorie, pagination
    return query.all()
```

Pourquoi c'est critique :

- si un developpeur oublie un filtre sur UNE route, une entreprise voit les donnees d'une autre
- les routes ne doivent pas faire directement des requetes libres
- les services/repositories doivent toujours demander `company_id`
- les tests multi-tenant de l'etape 9 doivent verifier que l'isolation fonctionne vraiment

## Systeme d'invitation

```text
POST /invitations          → admin envoie une invitation par email
GET  /invitations          → admin voit les invitations envoyees
POST /auth/register-invite → employe s'inscrit via le lien d'invitation
DELETE /invitations/{id}   → admin annule une invitation
```

Processus :

1. l'admin entre l'email et le role de l'employe a inviter
2. le systeme envoie un email avec un lien unique
3. l'employe clique sur le lien et complete son inscription
4. il est automatiquement rattache a la bonne entreprise avec le bon role

## Routes API

```text
POST /companies             → creer une entreprise (pendant l'inscription admin)
GET  /companies/me          → info de mon entreprise
PATCH /companies/me         → modifier les infos de mon entreprise

POST /users                 → admin ajoute un utilisateur manuellement
GET  /users                 → liste des utilisateurs de mon entreprise
GET  /users/{id}            → detail d'un utilisateur
PATCH /users/{id}/role      → changer le role d'un utilisateur
PATCH /users/{id}/activate  → activer un utilisateur
PATCH /users/{id}/deactivate → desactiver un utilisateur (ne supprime pas les donnees)
```

Regle importante :

Toutes les requetes doivent filtrer par l'entreprise de l'utilisateur connecte via les services/repositories.

---

# 5. Frontend

## Pages minimum

```text
/dashboard/company          → informations de l'entreprise
/dashboard/users            → liste des employes
/dashboard/users/invite     → formulaire d'invitation
```

## Actions minimum

- voir les informations de l'entreprise
- modifier les informations de l'entreprise (admin uniquement)
- voir la liste des employes avec leur role et statut
- inviter un employe par email
- ajouter un employe manuellement
- changer le role d'un utilisateur
- desactiver un utilisateur (avec confirmation)
- reactiver un utilisateur desactive

## Onboarding premier utilisateur

Quand un nouvel admin s'inscrit :

1. il cree son compte + le nom de son entreprise
2. il arrive sur un ecran de bienvenue qui lui explique les prochaines etapes
3. il est guide pour inviter ses premiers employes

Ce flux d'onboarding est essentiel pour que le premier utilisateur ne soit pas perdu.

---

# 6. Checkpoint

A la fin de cette etape :

```text
OK - FlowBon gere plusieurs entreprises
OK - chaque utilisateur appartient a une entreprise
OK - les donnees ne sont JAMAIS melangees (services/repositories filtres par company_id)
OK - un admin peut inviter son equipe par email
OK - un admin peut ajouter manuellement des employes
OK - un admin peut desactiver un employe sans perdre ses donnees
OK - un role super_admin existe pour le proprietaire du SaaS
OK - l'onboarding guide le premier utilisateur
```

Quand c'est termine, on passe a :

# ETAPE 4 - BONS DE DEPENSES
