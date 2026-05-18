# 📋 Prérequis Infrastructure — FlowBon SaaS

Ce document définit les exigences minimales et recommandées pour l'hébergement de la solution SaaS **FlowBon** en production.

---

## 1. Système d'Exploitation

| Critère | Recommandé |
|---|---|
| OS | **Ubuntu 22.04 LTS** ou Ubuntu 24.04 LTS |
| Alternatives | Debian 12, Rocky Linux 9, AlmaLinux 9 |
| Architecture | `x86_64 (AMD64)` |
| Mise à jour | Système entièrement à jour (`apt update && apt upgrade`) |

> ⚠️ **Windows Server n'est pas supporté.** FlowBon est optimisé pour Linux.

---

## 2. Dimensionnement Matériel

Le dimensionnement dépend du nombre d'entreprises hébergées et du volume de dépenses traitées.

### 📦 Configuration Minimale (Démarrage / Test)
> Convient pour 1 à 3 entreprises clientes, usage faible.

| Composant | Minimum |
|---|---|
| CPU | 2 vCPU |
| RAM | 4 Go |
| Disque OS | 20 Go SSD |
| Disque Données | 20 Go SSD (volumes Docker) |
| Bande Passante | 100 Mbps |

### 🚀 Configuration Recommandée (Production Standard)
> Convient pour 5 à 20 entreprises clientes, usage modéré.

| Composant | Recommandé |
|---|---|
| CPU | 4 vCPU |
| RAM | 8 Go |
| Disque OS | 40 Go SSD |
| Disque Données | 100 Go SSD (volumes Docker) |
| Bande Passante | 500 Mbps |

### 🏢 Configuration Haute Disponibilité (Production Intensive)
> Convient pour 20+ entreprises clientes, usage intensif.

| Composant | Haute Dispo |
|---|---|
| CPU | 8 vCPU |
| RAM | 16 Go |
| Disque OS | 60 Go SSD NVMe |
| Disque Données | 500 Go SSD NVMe |
| Bande Passante | 1 Gbps |

---

## 3. Calcul de Stockage

Le stockage principal est utilisé pour :
- **La base de données PostgreSQL** : ~1 Mo par entreprise pour les données de base. Volume croissant avec les bons de dépenses.
- **Les justificatifs (pièces jointes)** : Estimez **~500 Ko à 2 Mo** par bon de dépense avec justificatif.

**Formule estimative :**
```
Stockage (Go) = (Nb. bons de dépenses × 1.5 Mo) / 1024
```

Exemple : 10 000 bons = ~15 Go de pièces jointes.

---

## 4. Logiciels Requis

Ces logiciels doivent être installés sur le serveur hôte **avant** le déploiement.
Le script `prepare_host.sh` les installe automatiquement.

| Logiciel | Version Minimale | Rôle |
|---|---|---|
| **Docker Engine** | 24.x ou supérieur | Moteur de conteneurisation |
| **Docker Compose** | 2.x (plugin v2) | Orchestration des services |
| **curl** | Toute version | Téléchargement des scripts |
| **git** (optionnel) | Toute version | Mise à jour de la configuration |

---

## 5. Réseau & Sécurité

### Ports à ouvrir dans le pare-feu (Firewall)

| Port | Protocole | Service | Description |
|---|---|---|---|
| `80` | TCP | HTTP | Trafic web (redirigé vers HTTPS) |
| `443` | TCP | HTTPS | Trafic web sécurisé |
| `22` | TCP | SSH | Administration distante (restreindre à votre IP) |

> ⛔ Les ports `5432` (PostgreSQL), `8000` (API) et `3000` (Frontend) **ne doivent PAS être exposés** sur l'internet public. Ils sont accessibles uniquement via le réseau interne Docker.

### DNS
- Pointer votre nom de domaine (ex: `flowbon.votreentreprise.com`) vers l'adresse IP publique du serveur.
- Le certificat HTTPS sera généré automatiquement par **Caddy** (Let's Encrypt).

---

## 6. Configuration SMTP (E-mails)

FlowBon envoie des e-mails pour les notifications (invitations, approbations, etc.).
Vous devez disposer d'un accès SMTP valide. Options recommandées :

| Service | Avantage |
|---|---|
| **Gmail** (App Password) | Simple, gratuit jusqu'à 500 emails/jour |
| **SendGrid** | Scalable, pour de grands volumes |
| **Mailgun** | Professionnel, bonne délivrabilité |
| **Serveur SMTP propre** | Contrôle total |

---

## 7. Checklist Pré-Déploiement

Avant de lancer le déploiement, vérifier les points suivants :

- [ ] Le serveur répond aux exigences matérielles minimales
- [ ] L'OS est Ubuntu 22.04 LTS ou équivalent, entièrement mis à jour
- [ ] Un nom de domaine est configuré et pointe vers l'IP du serveur
- [ ] Les ports 80 et 443 sont ouverts dans le pare-feu
- [ ] Les identifiants SMTP sont disponibles
- [ ] Un mot de passe fort est préparé pour la base de données PostgreSQL
- [ ] Une clé secrète JWT forte (32+ caractères) est générée
- [ ] L'espace disque disponible est suffisant (données + sauvegardes)
