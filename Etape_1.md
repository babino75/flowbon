# ETAPE 1 - SETUP INITIAL DE FLOWBON

Objectif : poser une base propre et professionnelle pour construire FlowBon comme un SaaS securise et maintenable.

A la fin de cette etape, on doit avoir :

- un repo organise avec README et .env.example
- un backend FastAPI qui repond avec CORS configure
- un frontend Next.js qui demarre
- une configuration preparee pour PostgreSQL et Alembic
- une premiere connexion frontend -> backend
- les dependances verrouillees (requirements.txt)

---

# 1. Creer le projet local

Si le dossier n'existe pas encore :

```bash
mkdir flowbon
cd flowbon
git init
```

Si le dossier existe deja, se placer dedans :

```bash
cd flowbon
```

---

# 2. Structure de base

Structure recommandee :

```text
flowbon/
 - frontend/
 - backend/
 - docs/
 - docker/
 - database/
```

Commande :

```bash
mkdir -p frontend backend docs docker database
```

Role des dossiers :

- `frontend` : interface web Next.js
- `backend` : API FastAPI
- `database` : migrations Alembic, schemas ou notes SQL
- `docker` : configuration Docker (Dockerfiles)
- `docs` : documentation produit et technique

---

# 3. Git et fichiers sensibles

Creer un fichier `.gitignore` a la racine :

```gitignore
.env
*.env
.env.local
__pycache__/
*.pyc
venv/
.venv/
node_modules/
.next/
dist/
build/
uploads/
*.log
```

Important :

- ne jamais envoyer les fichiers `.env` sur GitHub
- ne jamais mettre de vrai mot de passe dans les fichiers `.md`
- garder les secrets uniquement en local ou dans le dashboard du service de deploiement

---

# 4. README.md

Creer un `README.md` a la racine du projet :

```markdown
# FlowBon

SaaS de gestion des bons de depenses et remboursements pour PME.

## Stack technique

- Backend : FastAPI (Python)
- Frontend : Next.js (TypeScript)
- Base de donnees : PostgreSQL
- Conteneurisation : Docker

## Lancer le projet en local

### Backend - premier lancement

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # puis editer les valeurs
uvicorn app.main:app --reload

### Backend - apres creation des modeles

alembic upgrade head

### Frontend

cd frontend
npm install
cp .env.example .env.local  # puis editer les valeurs
npm run dev

### Docker (optionnel)

Docker sera utile avant le deploiement. Ne pas le laisser bloquer le premier lancement local.

docker-compose up -d
```

---

# 5. Creer le repo GitHub

Sur GitHub :

- nom : `flowbon`
- visibilite : private conseille pour un SaaS

Puis :

```bash
git remote add origin https://github.com/TON_USER/flowbon.git
git branch -M main
git add .
git commit -m "Initial FlowBon setup"
git push -u origin main
```

---

# 6. Setup backend FastAPI

Dans le dossier backend :

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

Installer les dependances de depart :

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv pydantic-settings alembic
```

Dependances qui seront ajoutees dans les etapes suivantes :

```bash
pip install passlib[bcrypt] python-jose[cryptography] python-multipart slowapi
```

Verrouiller les dependances :

```bash
pip freeze > requirements.txt
```

---

# 7. Structure backend complete

Creer la structure avec couche services et middleware :

```bash
mkdir -p app/routes app/models app/schemas app/services app/middleware app/utils app/core
touch app/__init__.py app/main.py app/config.py app/database.py
touch app/routes/__init__.py
touch app/models/__init__.py
touch app/schemas/__init__.py
touch app/services/__init__.py
touch app/middleware/__init__.py
touch app/utils/__init__.py
touch app/core/__init__.py
```

Structure cible :

```text
backend/
 - app/
   - main.py          # point d'entree FastAPI
   - config.py         # configuration depuis .env
   - database.py       # connexion SQLAlchemy + session
   - routes/           # endpoints API (recoit les requetes)
   - models/           # modeles SQLAlchemy (structure BDD)
   - schemas/          # schemas Pydantic (validation entree/sortie)
   - services/         # logique metier (traite les donnees)
   - middleware/       # auth, CORS, rate limiting
   - utils/            # helpers (email, fichiers, etc.)
   - core/             # fonctions partagees (securite, deps)
 - alembic/            # dossier de migrations
 - alembic.ini         # configuration Alembic
 - requirements.txt    # dependances verrouillees
 - .env.example        # template des variables d'environnement
 - venv/
```

Roles des couches :

- `routes` : recoit la requete HTTP, appelle le service, retourne la reponse
- `services` : contient la logique metier (ne connait pas HTTP)
- `models` : structure des tables en base de donnees
- `schemas` : validation des donnees en entree et format de sortie
- `middleware` : intercepte chaque requete (auth, logs, rate limit)
- `utils` : fonctions utilitaires reutilisables (envoi email, upload fichier)

---

# 8. Configuration backend

Creer `backend/.env.example` (a committer sur Git) :

```env
APP_NAME=FlowBon
APP_ENV=local
DATABASE_URL=postgresql://flowbon:flowbon123@localhost:5432/flowbon
SECRET_KEY=change_me_in_production_use_a_long_random_string
FRONTEND_URL=http://localhost:3000
```

Creer `backend/.env` (a NE PAS committer) :

```env
APP_NAME=FlowBon
APP_ENV=local
DATABASE_URL=postgresql://flowbon:flowbon123@localhost:5432/flowbon
SECRET_KEY=ma_vraie_cle_secrete_longue_et_aleatoire
FRONTEND_URL=http://localhost:3000
```

Fichier `backend/app/config.py` :

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "FlowBon"
    app_env: str = "local"
    database_url: str = "postgresql://flowbon:flowbon123@localhost:5432/flowbon"
    secret_key: str = "change_me"
    frontend_url: str = "http://localhost:3000"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
```

---

# 9. Code backend minimal avec CORS

Fichier `backend/app/main.py` :

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.app_env == "local" else None,
)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "FlowBon API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name, "env": settings.app_env}
```

Note : plus tard, en production, la documentation Swagger (`/docs`) sera desactivee pour eviter d'exposer l'API publiquement.

---

# 10. Alembic pour les migrations

Initialiser Alembic :

```bash
cd backend
alembic init alembic
```

Modifier `alembic.ini` :

```ini
sqlalchemy.url = postgresql://flowbon:flowbon123@localhost:5432/flowbon
```

Plus tard, on remplacera cette valeur en dur par la variable `DATABASE_URL`.

Modifier `alembic/env.py` pour importer les modeles :

```python
from app.database import Base
from app.models import *  # importer tous les modeles

target_metadata = Base.metadata
```

Pourquoi Alembic est indispensable :

- `Base.metadata.create_all()` cree les tables mais ne gere PAS les modifications
- En production, si tu ajoutes un champ a une table, sans Alembic tu dois detruire et recreer la base
- Alembic genere des scripts de migration versiones et reversibles

Commandes principales :

```bash
alembic revision --autogenerate -m "description"   # generer une migration
alembic upgrade head                                # appliquer les migrations
alembic downgrade -1                                # annuler la derniere migration
```

---

# 11. Setup frontend Next.js

Depuis la racine :

```bash
cd frontend
npx create-next-app@latest .
```

Choix recommandes :

- TypeScript : yes
- App Router : yes
- TailwindCSS : yes
- ESLint : yes
- src directory : selon preference, mais rester coherent ensuite

Lancer :

```bash
npm run dev
```

Tester :

```text
http://localhost:3000
```

---

# 12. Variables frontend

Creer `frontend/.env.example` (a committer) :

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Creer `frontend/.env.local` (a NE PAS committer) :

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

# 13. Premiere connexion frontend -> backend

Objectif : afficher dans le frontend que l'API repond.

Appel attendu :

```text
GET http://127.0.0.1:8000/health
```

Resultat attendu :

```json
{
  "status": "ok",
  "app": "FlowBon",
  "env": "local"
}
```

Cette petite integration valide que les deux parties peuvent communiquer avant de construire l'authentification.

---

# 14. Docker

Docker est important pour deployer FlowBon proprement, surtout si tu choisis un VPS ou une infrastructure controlee. Il peut cependant attendre un peu pendant le tout premier developpement local.

Priorite MVP :

1. backend local
2. frontend local
3. base PostgreSQL locale ou hebergee
4. Docker ensuite si necessaire

Quand on l'ajoute, creer les Dockerfiles. Les exemples ci-dessous supposent que le contexte de build est la racine du repo.

`docker/Dockerfile.backend` :

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`docker/Dockerfile.frontend` :

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY frontend/package*.json .
RUN npm ci
COPY frontend/ .
RUN npm run build
CMD ["npm", "start"]
```

Services minimum dans `docker-compose.yml` :

- postgres
- backend
- frontend

---

# 15. Checkpoint

A la fin de cette etape, tu dois avoir :

```text
OK - repo Git initialise
OK - README.md avec instructions de lancement
OK - .env.example dans backend ET frontend
OK - structure frontend/backend/docs/docker/database
OK - backend FastAPI lance avec CORS
OK - endpoint /health fonctionnel
OK - Alembic prepare pour les migrations
OK - requirements.txt verrouille
OK - frontend Next.js lance
OK - frontend capable d'appeler le backend
OK - fichiers .env ignores par Git
OK - dependances de base verrouillees
```

Phrase de fin :

```text
setup termine
```

Ensuite on passe a :

# ETAPE 2 - AUTHENTIFICATION ET ROLES
