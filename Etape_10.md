# ETAPE 10 - DEPLOIEMENT ET PREMIERS CLIENTS

Objectif : mettre FlowBon en ligne de maniere securisee et obtenir les premiers retours clients.

---

# 1. Objectif produit

FlowBon doit etre accessible sur internet pour une demo et pour les premiers clients pilotes, avec un niveau de securite acceptable pour gerer des donnees financieres.

---

# 2. Deploiement MVP

## Architecture recommandee

```text
Frontend → Vercel (gratuit, HTTPS automatique, deploiement via Git)
Backend  → Render ou Railway (gratuit/peu couteux, HTTPS automatique)
BDD      → Neon ou Supabase PostgreSQL (gratuit, managed, backup inclus)
Fichiers → Cloudinary ou S3 (stockage des justificatifs)
Email    → Resend (gratuit jusqu'a 3000 emails/mois)
Domaine  → flowbon.com ou flowbon.app (via Namecheap, OVH, etc.)
```

## Variables d'environnement en production

```text
# Backend (configurer dans le dashboard Render/Railway, JAMAIS dans le code)
DATABASE_URL=postgresql://user:pass@host:5432/flowbon_prod
SECRET_KEY=une_cle_tres_longue_et_aleatoire_de_64_caracteres
FRONTEND_URL=https://flowbon.com
APP_ENV=production
RESEND_API_KEY=re_xxxxxxxxxxxx
ALLOWED_ORIGINS=https://flowbon.com

# Frontend (configurer dans le dashboard Vercel)
NEXT_PUBLIC_API_URL=https://api.flowbon.com
```

---

# 3. Securite en production

## HTTPS / SSL

- Vercel fournit HTTPS automatiquement pour le frontend
- Render et Railway fournissent HTTPS automatiquement pour le backend
- JAMAIS deployer sans HTTPS. Les tokens JWT transitent dans les headers, sans HTTPS ils sont lisibles par n'importe qui sur le reseau

## Headers de securite

Ajouter des headers de securite sur le backend :

```python
# middleware/security.py

from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
```

## Desactiver la documentation Swagger en production

```python
app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
)
```

## Protection des donnees

- mots de passe hashes avec bcrypt (jamais en clair)
- tokens JWT avec expiration
- rate limiting sur les routes sensibles
- isolation des donnees par company_id
- fichiers .env jamais commites

---

# 4. Monitoring et erreurs

## Sentry (capture d'erreurs)

Sentry est gratuit pour les petits projets et capture automatiquement les erreurs en production.

```bash
pip install sentry-sdk[fastapi]
```

```python
# main.py
import sentry_sdk

if settings.app_env == "production":
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
    )
```

Pourquoi c'est indispensable :

- sans Sentry, si quelque chose plante chez un client, tu ne le sauras jamais
- avec Sentry, tu recois un email avec le detail de l'erreur, la stack trace, et le contexte
- tu peux corriger le bug avant que le client ne te contacte

## Logs structurees

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("flowbon")
```

---

# 5. Backup de la base de donnees

Pour un SaaS qui gere des donnees financieres, les backups sont obligatoires.

## Avec un service managed (recommande)

- Neon : backups automatiques inclus
- Supabase : backups quotidiens inclus
- Railway PostgreSQL : backups disponibles

## Avec PostgreSQL auto-heberge

```bash
# Backup quotidien via cron
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restaurer un backup
psql $DATABASE_URL < backup_20250315.sql
```

Regle : toujours avoir au moins 7 jours de backups.

---

# 6. CI/CD (Integration Continue)

Configurer GitHub Actions pour automatiser les verifications a chaque push :

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: cd frontend && npm ci && npm run build
```

Cela garantit que chaque modification est testee automatiquement avant deploiement.

---

# 7. Checklist avant mise en ligne

```text
SECURITE
 OK - HTTPS actif sur frontend ET backend
 OK - mots de passe hashes avec bcrypt
 OK - tokens JWT avec expiration
 OK - rate limiting sur /auth/login et /auth/register
 OK - fichiers .env non commites
 OK - documentation Swagger desactivee en production
 OK - headers de securite configures

FONCTIONNEL
 OK - auth fonctionne (inscription, connexion, refresh, reset password)
 OK - creation de bon fonctionne
 OK - validation fonctionne (approve, reject, mark as paid)
 OK - dashboard fonctionne avec filtres
 OK - notifications email envoyees
 OK - export CSV fonctionne
 OK - une entreprise ne voit pas les donnees d'une autre

INFRASTRUCTURE
 OK - Sentry configure pour capturer les erreurs
 OK - backups de la base de donnees actifs
 OK - domaine personnalise configure
 OK - CI/CD en place (GitHub Actions)
 OK - variables d'environnement securisees dans le dashboard du provider
```

---

# 8. Premiers clients

Objectif : ne pas viser 100 clients au debut.

Chercher d'abord :

- 3 entreprises pilotes (PME de 10-50 employes)
- 1 cabinet comptable
- 1 ecole ou ONG

Questions a poser :

- Comment gerez-vous les depenses aujourd'hui ?
- Qui valide les demandes ?
- Combien de temps prend un remboursement ?
- Qu'est-ce qui vous enerve dans le processus actuel ?
- Combien payeriez-vous pour eviter ce probleme ?

Offre de lancement :

- 1 mois gratuit pour les 5 premiers clients
- support personnalise pendant le premier mois
- ajustements du produit selon leurs retours

---

# 9. Checkpoint

A la fin de cette etape :

```text
OK - FlowBon est en ligne avec HTTPS
OK - le domaine personnalise est configure
OK - Sentry capture les erreurs en production
OK - les backups de la base sont actifs
OK - le CI/CD est en place
OK - la checklist de securite est validee
OK - tu peux faire des demos en ligne
OK - tu peux embarquer des premiers clients pilotes
OK - tu peux ajuster le produit selon leurs retours
```

Apres cette etape, FlowBon est un MVP solide, securise et vendable. La suite consiste a apprendre avec les vrais clients et a ajouter uniquement ce qui aide a vendre ou a garder les entreprises.

---

# APRES LES 10 ETAPES

Prochaines grandes ameliorations possibles :

```text
Phase 2 - Fonctionnalites avancees
 - OCR factures (lecture automatique des montants)
 - export PDF des rapports
 - analytics avancees (comparaison mois par mois)
 - multi-langue (francais + anglais)

Phase 3 - Intelligence
 - IA assistant comptable
 - detection de fraude (montants anormaux, doublons)
 - automatisation intelligente (regles de validation automatiques)

Phase 4 - Mobile et paiements
 - application mobile (React Native ou Flutter)
 - integration Mobile Money (Orange Money, Wave, MTN)
 - paiement en ligne des abonnements (Stripe ou Paystack)
```
