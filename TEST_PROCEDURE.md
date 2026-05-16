# Procédure de test FlowBon

Ce document présente les tests à réaliser pour vérifier l'état actuel du projet FlowBon.

## 1. Objectif

Vérifier que :
- le backend démarre correctement dans Docker
- le frontend démarre correctement dans Docker
- les services communiquent entre eux
- les endpoints principaux sont accessibles

## 2. Prérequis

- Docker et Docker Compose installés
- Port `3000` disponible pour le frontend
- Port `8000` disponible pour le backend
- Port `5432` disponible pour PostgreSQL

## 3. Démarrage via Docker Compose

Depuis la racine du projet :

```bash
cd /home/sahm/flowbon
docker compose up -d --build
```

## 4. Vérifier le statut des services

Depuis la racine du projet :

```bash
docker compose ps
```

Les services attendus :
- `flowbon-db` : `Up`
- `flowbon-backend` : `Up`
- `flowbon-frontend` : `Up`

Si `flowbon-backend` est en redémarrage ou `Exit`, consultez immédiatement les logs :

```bash
docker compose logs --tail 20 backend
```

Le backend doit être visible sur le port `8000` et le frontend sur le port `3000`.

## 5. Vérifier le backend

URL de base du backend :

- http://localhost:8000
- Documentation OpenAPI : http://localhost:8000/docs

### Test rapide

```bash
curl -I http://localhost:8000
```

La réponse attendue est un code HTTP `405` ou `200`. Cela confirme que le serveur est bien accessible.

### Santé et documentation

- `http://localhost:8000/health` si ce endpoint est installé
- `http://localhost:8000/docs` pour vérifier l’OpenAPI et les routes

## 6. Vérifier le frontend

URL du frontend :

- http://localhost:3000

Ouvrir cette URL dans un navigateur et vérifier que la page se charge.

## 7. Tester l’API depuis le frontend

Le frontend utilise l’URL interne :

- `http://backend:8000`

Dans le navigateur, vérifier que le frontend parvient bien à charger les données via la page d’accueil ou le dashboard.

## 8. Endpoints principaux à tester

### Authentification

- `POST http://localhost:8000/auth/login`
- `POST http://localhost:8000/auth/register`

### Utilisateurs

- `GET http://localhost:8000/users/me`

### Dépenses

- `GET http://localhost:8000/expenses`
- `POST http://localhost:8000/expenses`
- `GET http://localhost:8000/expenses/{expense_id}`
- `POST http://localhost:8000/expenses/{expense_id}/attachments`
- `DELETE http://localhost:8000/expenses/{expense_id}/attachments/{attachment_id}`

## 9. Scénarios de test recommandés

1. Créer un utilisateur / se connecter.
2. Créer un bon de dépense.
3. Consulter la liste des dépenses.
4. Consulter un bon de dépense créé.
5. Télécharger un justificatif sur un bon de dépense.
6. Supprimer un justificatif.

## 10. Vérification des logs

Consulter les logs Docker pour détecter des erreurs :

```bash
docker compose logs --tail 50 backend
docker compose logs --tail 50 frontend
```

## 11. Liens utiles

- Frontend : http://localhost:3000
- Backend : http://localhost:8000
- API Docs : http://localhost:8000/docs

---

> Ce guide est adapté à l'état actuel du projet : backend et frontend exécutés en Docker Compose avec communication via `backend:8000` depuis le frontend.
