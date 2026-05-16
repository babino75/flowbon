# FlowBon

FlowBon est un SaaS de gestion des bons de depenses, validations et remboursements pour PME.

## Stack technique

- Backend : FastAPI (Python)
- Frontend : Next.js (TypeScript)
- Base de donnees : PostgreSQL
- Conteneurisation : Docker

## Lancer le backend en local

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API locale :

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/health
```

## Lancer le frontend en local

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend local :

```text
http://localhost:3000
```

## Docker

Docker est prepare pour lancer PostgreSQL, le backend et le frontend ensemble.

```bash
docker compose up --build
```

## Migrations

Alembic est initialise. Quand les modeles SQLAlchemy seront prets :

```bash
cd backend
alembic revision --autogenerate -m "message"
alembic upgrade head
```

