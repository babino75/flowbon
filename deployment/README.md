# 🚀 FlowBon SaaS — Guide Complet d'Installation, Configuration et Déploiement

> **FlowBon** est une solution SaaS de gestion de notes de frais, d'avances de caisse et de workflows d'approbation. Ce guide vous permettra de déployer la plateforme sur votre propre infrastructure en moins de 15 minutes.

---

## 📋 Table des Matières

1. [Architecture de Déploiement](#architecture)
2. [Prérequis](#prérequis)
3. [Étape 1 — Préparation du Serveur](#étape-1--préparation-du-serveur)
4. [Étape 2 — Configuration](#étape-2--configuration)
5. [Étape 3 — Déploiement](#étape-3--déploiement)
6. [Étape 4 — Accès à l'Application](#étape-4--accès-à-lapplication)
7. [Administration Quotidienne](#administration-quotidienne)
8. [Sauvegarde & Restauration](#sauvegarde--restauration)
9. [Monitoring & Logs](#monitoring--logs)
10. [Mise à Jour](#mise-à-jour)
11. [Résolution de Problèmes](#résolution-de-problèmes)

---

## Architecture

```
                    Internet
                       │
                  ┌────▼────┐
                  │  Caddy  │  ← HTTPS automatique (Let's Encrypt)
                  │  :443   │    Reverse Proxy + Compression + Sécurité
                  └────┬────┘
                       │ Réseau interne Docker (flowbon-net)
          ┌────────────┼───────────────┐
          │            │               │
    ┌─────▼─────┐ ┌────▼────┐  ┌──────▼──────┐
    │ Frontend  │ │ Backend │  │ PostgreSQL  │
    │ Next.js   │ │ FastAPI │  │   :5432     │
    │  :3000    │ │  :8000  │  └──────┬──────┘
    └───────────┘ └─────────┘         │
                                ┌─────▼─────┐
                                │  Volume   │
                                │  pgdata   │  ← Données persistantes
                                └───────────┘
```

> **Code source** : Reste chez l'éditeur. Seules les **images Docker pré-compilées** sont déployées sur vos serveurs.

---

## Prérequis

Consultez le guide détaillé : [`docs/PREREQUISITES.md`](docs/PREREQUISITES.md)

**Résumé rapide :**

| Composant | Minimum |
|---|---|
| OS | Ubuntu 22.04 LTS |
| CPU | 2 vCPU |
| RAM | 4 Go |
| Disque | 40 Go SSD |
| Ports ouverts | 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| Nom de domaine | Requis (ex: `flowbon.votreentreprise.com`) |

---

## Étape 1 — Préparation du Serveur

> Exécuter **une seule fois** sur un nouveau serveur.

```bash
# Se connecter au serveur en root
ssh root@VOTRE_IP_SERVEUR

# Télécharger et exécuter le script de préparation
bash scripts/prepare_host.sh
```

Ce script va automatiquement :
- ✅ Vérifier les ressources matérielles (CPU, RAM, disque)
- ✅ Mettre à jour le système d'exploitation
- ✅ Installer **Docker Engine** et **Docker Compose v2**
- ✅ Configurer les paramètres système optimaux pour PostgreSQL
- ✅ Ouvrir les ports 80 et 443 dans le pare-feu (UFW)
- ✅ Créer la structure de dossiers `/opt/flowbon/`

---

## Étape 2 — Configuration

### 2.1 Copier les fichiers de déploiement sur le serveur

```bash
# Depuis votre machine locale, copier le dossier deployment/ sur le serveur
scp -r deployment/ root@VOTRE_IP_SERVEUR:/opt/flowbon/
```

### 2.2 Créer le fichier de configuration

```bash
# Sur le serveur
cd /opt/flowbon/deployment

# Copier le fichier d'exemple
cp .env.example .env

# Éditer avec vos valeurs
nano .env
```

### 2.3 Renseigner les variables essentielles

Ouvrez `.env` et configurez ces valeurs **obligatoires** :

```dotenv
# 🌐 Votre nom de domaine (doit pointer vers l'IP du serveur)
DOMAIN=flowbon.votreentreprise.com

# 🔐 Clé secrète JWT — Générer avec :  openssl rand -hex 32
SECRET_KEY=votre_cle_secrete_tres_longue_et_aleatoire

# 🐘 Base de données (mot de passe fort recommandé)
DB_USER=flowbon
DB_PASSWORD=votre_mot_de_passe_fort
DB_NAME=flowbon

# 📧 Configuration e-mail (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-app-password-gmail

# 🐳 Images Docker (fournies par l'éditeur FlowBon)
BACKEND_IMAGE=flowbon/backend:latest
FRONTEND_IMAGE=flowbon/frontend:latest
```

> 💡 **Générer une clé secrète sécurisée :**
> ```bash
> openssl rand -hex 32
> ```

---

## Étape 3 — Déploiement

```bash
cd /opt/flowbon/deployment

# Premier déploiement complet
sudo bash scripts/deploy.sh
```

Le script va :
1. 🔍 Vérifier la configuration et les dépendances
2. 📥 Récupérer les images Docker du registre
3. 🚀 Démarrer tous les conteneurs
4. 🗃️ Appliquer les migrations de base de données automatiquement
5. 🏥 Vérifier l'état de santé des services

**Durée estimée : 2 à 5 minutes** selon la connexion internet du serveur.

---

## Étape 4 — Accès à l'Application

Une fois le déploiement terminé :

| Service | URL |
|---|---|
| 🌐 **Application FlowBon** | `https://VOTRE_DOMAINE` |
| 🔧 **API (documentation)** | `https://VOTRE_DOMAINE/api/docs` |

### Création du premier compte Super Admin

```bash
# Accéder au conteneur backend
docker exec -it flowbon-backend bash

# Créer le Super Admin depuis le conteneur
python app/promote.py --email votre@email.com --role super_admin

# Quitter le conteneur
exit
```

Le Super Admin peut ensuite accéder au **Portail de supervision globale** depuis son tableau de bord pour créer et gérer les entreprises clientes.

---

## Administration Quotidienne

### Vérifier l'état des services

```bash
bash scripts/monitor.sh --status
```

### Consulter les logs en temps réel

```bash
bash scripts/monitor.sh --logs           # Tous les services
bash scripts/monitor.sh --logs backend   # Uniquement l'API
bash scripts/monitor.sh --logs caddy     # Accès HTTPS
```

### Ouvrir la console interactive de monitoring

```bash
bash scripts/monitor.sh
```

---

## Sauvegarde & Restauration

### Sauvegarde manuelle

```bash
bash scripts/backup.sh
```

Le dump est enregistré dans `/opt/flowbon/backups/` et compressé en `.sql.gz`.

### Sauvegarde automatique quotidienne (recommandé)

```bash
sudo crontab -e
```

Ajouter cette ligne pour une sauvegarde chaque jour à **2h00 du matin** :

```cron
0 2 * * * /bin/bash /opt/flowbon/deployment/scripts/backup.sh >> /opt/flowbon/logs/backup_cron.log 2>&1
```

### Lister les sauvegardes disponibles

```bash
bash scripts/backup.sh --list
```

### Restaurer une sauvegarde

```bash
bash scripts/backup.sh --restore
```

> ⚠️ La restauration écrase les données actuelles. Une confirmation est requise.

### Conservation

Les sauvegardes sont conservées **30 jours** par défaut, puis supprimées automatiquement.

---

## Monitoring & Logs

### Console interactive

```bash
bash scripts/monitor.sh
```

Disponible dans le menu :
- 📦 État des conteneurs & ressources CPU/RAM
- 🖥️ Espace disque et taille des volumes Docker
- 🐘 Diagnostics PostgreSQL (taille DB, connexions actives)
- 🌐 Diagnostics réseau et test HTTPS
- 📊 Génération d'un rapport complet sauvegardé

### Commandes Docker utiles

```bash
# État de tous les conteneurs FlowBon
docker compose -f /opt/flowbon/deployment/docker-compose.prod.yml ps

# Redémarrer un service spécifique
docker compose -f /opt/flowbon/deployment/docker-compose.prod.yml restart backend

# Arrêter tous les services
docker compose -f /opt/flowbon/deployment/docker-compose.prod.yml down

# Démarrer tous les services
docker compose -f /opt/flowbon/deployment/docker-compose.prod.yml up -d
```

---

## Mise à Jour

Lorsqu'une nouvelle version de FlowBon est disponible :

```bash
cd /opt/flowbon/deployment

# Sauvegarder la DB avant la mise à jour (recommandé)
bash scripts/backup.sh

# Mettre à jour les images et redémarrer
bash scripts/deploy.sh --update
```

Le script récupère automatiquement les nouvelles images et applique les migrations de base de données.

---

## Résolution de Problèmes

### ❌ L'application n'est pas accessible via HTTPS

1. Vérifier que le DNS pointe vers l'IP du serveur : `nslookup VOTRE_DOMAINE`
2. Vérifier que les ports 80/443 sont ouverts : `bash scripts/monitor.sh --network`
3. Consulter les logs Caddy : `bash scripts/monitor.sh --logs caddy`

### ❌ Le backend ne démarre pas

```bash
# Consulter les logs détaillés du backend
bash scripts/monitor.sh --logs backend

# Vérifier la connexion à la base de données
bash scripts/monitor.sh --db
```

### ❌ Les e-mails ne partent pas

1. Vérifier la configuration SMTP dans `.env`
2. Pour Gmail, vérifier que l'**App Password** est correctement configuré
3. Consulter les logs backend pour les erreurs SMTP

### ❌ Erreur "no space left on device"

```bash
# Vérifier l'espace disque
df -h /

# Nettoyer les images Docker inutilisées
docker image prune -f

# Nettoyer les anciennes sauvegardes
bash scripts/backup.sh --clean
```

### ❌ Base de données corrompue ou problème de migration

```bash
# Accéder au conteneur backend
docker exec -it flowbon-backend bash

# Vérifier l'état des migrations Alembic
alembic current
alembic history

# Appliquer manuellement les migrations
alembic upgrade head
exit
```

---

## 📞 Support

Pour toute question ou assistance, contacter l'équipe FlowBon.

---

*Guide généré pour FlowBon SaaS v2 — Dernière mise à jour : Mai 2026*
