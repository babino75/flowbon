# ETAPE 2 - AUTHENTIFICATION ET ROLES

Objectif : permettre a chaque utilisateur de se connecter a FlowBon avec un role clair, de maniere securisee.

Cette etape transforme FlowBon d'une simple app technique en produit utilisable par une entreprise.

---

# 1. Objectif produit

Une entreprise doit pouvoir avoir plusieurs types d'utilisateurs :

- admin entreprise
- manager
- comptable
- employe

Chaque role ne doit pas voir ni faire les memes actions.

---

# 2. Fonctionnalites a construire

## Authentification

- inscription avec validation des champs
- connexion avec email + mot de passe
- deconnexion (invalidation du refresh token)
- mot de passe hashe avec bcrypt (jamais en clair)
- token JWT (access token + refresh token)
- utilisateur connecte via token
- reinitialisation de mot de passe par email

## Roles

- `admin` : administrateur de l'entreprise
- `manager` : responsable d'equipe
- `accountant` : comptable
- `employee` : employe standard

## Permissions simples

- employe : creer et suivre ses propres bons
- manager : valider ou refuser les bons de son equipe
- comptable : marquer les bons approuves comme payes
- admin : voir les utilisateurs et les statistiques de l'entreprise

---

# 3. Backend

## Table principale

```text
users
 - id (UUID recommande pour un SaaS)
 - company_id (FK -> companies, ajoute en etape 3)
 - name
 - email (unique, indexe)
 - password_hash (JAMAIS stocker le mot de passe en clair)
 - role (enum: admin, manager, accountant, employee)
 - is_active (boolean, defaut true)
 - created_at
 - updated_at
```

Important : le champ doit s'appeler `password_hash` et non `password` pour rappeler qu'on ne stocke jamais le mot de passe en clair.

## Hachage du mot de passe

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

## Tokens JWT

Deux types de tokens :

- `access_token` : courte duree (30 minutes), utilise pour chaque requete API
- `refresh_token` : longue duree (7 jours), utilise uniquement pour renouveler l'access token

Pourquoi le refresh token est necessaire :

- sans lui, l'utilisateur est deconnecte toutes les 30 minutes
- avec lui, l'experience est fluide tout en restant securisee

## Routes API

```text
POST /auth/register           → inscription (valider email, hasher mdp)
POST /auth/login              → connexion (retourne access + refresh token)
POST /auth/refresh            → renouveler l'access token
POST /auth/logout             → invalider le refresh token cote serveur
GET  /auth/me                 → info utilisateur connecte
POST /auth/forgot-password    → envoyer un email de reinitialisation
POST /auth/reset-password     → changer le mot de passe avec le token recu par email
```

## Rate limiting (protection brute-force)

Les routes `/auth/login` et `/auth/register` doivent etre protegees :

```python
from slowapi import Limiter

@app.post("/auth/login")
@limiter.limit("5/minute")  # max 5 tentatives par minute par IP
async def login(request: Request):
    ...
```

Sans cette protection, un attaquant peut tester des milliers de mots de passe par minute.

## Validation des entrees (schemas Pydantic)

```python
from pydantic import BaseModel, EmailStr, validator

class RegisterSchema(BaseModel):
    name: str
    email: EmailStr  # valide automatiquement le format email
    password: str
    role: str = "employee"

    @validator("password")
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Le mot de passe doit faire au moins 8 caracteres")
        return v

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
```

---

# 4. Frontend

## Pages minimum

```text
/login
/register
/forgot-password
/reset-password
/dashboard
```

## Comportement attendu

- si l'utilisateur n'est pas connecte, il va sur `/login`
- si l'utilisateur est connecte, il va sur `/dashboard`
- le dashboard change selon son role
- le refresh token est stocke dans un cookie `httpOnly`, `Secure` et `SameSite`
- l'access token est garde en memoire cote frontend ou renvoye par le backend au besoin
- a chaque requete API, l'access token est envoye dans le header `Authorization: Bearer <token>`
- si l'access token expire, le frontend utilise automatiquement le refresh token

Important : eviter `localStorage` pour les tokens. C'est plus simple au debut, mais trop risque pour un SaaS qui manipule des donnees d'entreprise.

## Messages d'erreur clairs

- "Email ou mot de passe incorrect" (ne jamais dire lequel est faux)
- "Ce compte est desactive, contactez votre administrateur"
- "Mot de passe trop court (minimum 8 caracteres)"

---

# 5. Checkpoint

A la fin de cette etape :

```text
OK - un utilisateur peut creer un compte (mot de passe hashe avec bcrypt)
OK - un utilisateur peut se connecter (access token + refresh token)
OK - un utilisateur peut renouveler son token sans se reconnecter
OK - un utilisateur peut demander la reinitialisation de son mot de passe
OK - le backend connait son role
OK - le frontend protege les pages privees
OK - les routes /auth/login et /auth/register sont protegees par rate limiting
OK - les entrees sont validees avec Pydantic (email valide, mot de passe fort)
OK - les mots de passe ne sont JAMAIS stockes en clair
```

Quand c'est termine, on passe a :

# ETAPE 3 - ENTREPRISES ET MODE SAAS
