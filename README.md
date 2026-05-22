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

## Déploiement (Dev & Prod)

Ce projet supporte deux modes principaux : développement local (hot-reload) et déploiement Docker (production-like).

1) Développement local (rapide)

- Exécuter la stack en local (montage des sources, hot-reload pour backend et frontend) :

```bash
cd /home/sahm/flowbon
docker compose up --build
```

ou, si vous préférez utiliser les commandes locales sans Docker :

Backend :
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Frontend :
```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

2) Environnement Docker (pré-production / SaaS)

- Utiliser le fichier `docker-compose.prod.yml` pour lancer la stack sans monter le code source (recommandé pour essais proches de la prod) :

```bash
cd /home/sahm/flowbon
docker compose -f docker-compose.prod.yml up --build -d
```

- Le backend exécute automatiquement les migrations via `entrypoint.sh` (attend la DB puis lance `alembic upgrade head`).

3) Commandes utiles

- Voir les logs :
```bash
docker compose logs -f backend
```

- Récupérer les containers en local (down) :
```bash
docker compose down -v
```

4) Variables d'environnement importantes

- Backend (`docker-compose` / container env) :
	- `DATABASE_URL` : URL PostgreSQL (ex. `postgresql://flowbon:flowbon123@db:5432/flowbon`)
	- `APP_ENV` : `local` ou `production`
	- `FRONTEND_URLS` : valeurs CORS autorisées

- Frontend :
	- `NEXT_PUBLIC_API_URL` : URL de l'API côté client (valeur par défaut `/api` en conteneur)

5) Notes de sécurité et production

- Ne stockez pas de secrets (SMTP, DB passwords) dans `docker-compose.prod.yml` pour la production ; utilisez un secret manager ou variables d'environnement dans votre orchestrateur (Docker Swarm / Kubernetes / CI).
- Configurez un reverse-proxy TLS (Caddy / Traefik / Nginx) et activez HTTPS en production.

6) Dépannage rapide

- Si les migrations échouent, inspectez les logs du backend et exécutez manuellement :
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

---

Si tu veux, j'ajoute une section `CI/CD` (GitHub Actions) pour automatiser les builds et migrations au push vers `main`.

