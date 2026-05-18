#!/bin/bash
# =============================================================================
# FlowBon SaaS — Script de Déploiement / Mise à Jour (deploy.sh)
# Version : 1.0
#
# Ce script déploie ou met à jour l'application FlowBon en production.
# Il charge les variables d'environnement, récupère les dernières images
# Docker et applique les migrations de base de données automatiquement.
#
# USAGE :
#   sudo bash deploy.sh              # Premier déploiement
#   sudo bash deploy.sh --update     # Mise à jour (pull nouvelles images)
#   sudo bash deploy.sh --restart    # Redémarrer sans mise à jour
#
# PRÉREQUIS :
#   - Docker et Docker Compose v2 installés (lancer prepare_host.sh d'abord)
#   - Fichier .env renseigné (copier .env.example en .env)
# =============================================================================

set -e

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Variables ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"  # Le dossier deployment/
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/opt/flowbon/logs/deploy_${TIMESTAMP}.log"
MODE="deploy"

# ─── Fonctions utilitaires ───────────────────────────────────────────────────
print_header() {
    echo ""
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  🚀 FlowBon SaaS — Déploiement de Production${NC}"
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}   Mode : ${BOLD}$MODE${NC} | Timestamp : $TIMESTAMP"
    echo ""
}

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

print_step() { log "${YELLOW}${BOLD}▶ $1${NC}"; }
print_success() { log "${GREEN}  ✅ $1${NC}"; }
print_warning() { log "${YELLOW}  ⚠️  $1${NC}"; }
print_error() { log "${RED}  ❌ $1${NC}"; exit 1; }

# ─── Parsing des arguments ───────────────────────────────────────────────────
for arg in "$@"; do
    case $arg in
        --update)   MODE="update" ;;
        --restart)  MODE="restart" ;;
    esac
done

# ─── Vérifications préalables ────────────────────────────────────────────────
preflight_checks() {
    print_step "Vérifications préalables..."

    # Docker
    if ! command -v docker &>/dev/null; then
        print_error "Docker non installé. Lancez d'abord : sudo bash scripts/prepare_host.sh"
    fi
    print_success "Docker disponible : $(docker --version)"

    # Docker Compose v2
    if ! docker compose version &>/dev/null; then
        print_error "Docker Compose v2 non disponible."
    fi
    print_success "Docker Compose disponible : $(docker compose version --short)"

    # Fichier Compose
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Fichier Compose introuvable : $COMPOSE_FILE"
    fi
    print_success "Fichier Compose trouvé."

    # Fichier .env
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Fichier .env introuvable dans $DEPLOY_DIR. Copiez .env.example en .env et renseignez les valeurs."
    fi
    print_success "Fichier .env trouvé."

    # Vérification des variables critiques
    source "$ENV_FILE"
    if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "CHANGEZ_MOI_CLE_SECRETE_JWT_TRES_LONGUE_ET_ALEATOIRE" ]; then
        print_error "SECRET_KEY non configurée dans .env. Générez une clé avec : openssl rand -hex 32"
    fi
    if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "CHANGEZ_MOI_MOT_DE_PASSE_FORT" ]; then
        print_error "DB_PASSWORD non configurée dans .env."
    fi
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "flowbon.votredomaine.com" ]; then
        print_warning "DOMAIN dans .env semble être la valeur par défaut. Vérifiez votre configuration."
    fi

    print_success "Variables d'environnement critiques vérifiées."
}

# ─── Récupération des images Docker ─────────────────────────────────────────
pull_images() {
    print_step "Récupération des dernières images Docker..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    print_success "Images récupérées avec succès."
}

# ─── Démarrage des services ──────────────────────────────────────────────────
start_services() {
    print_step "Démarrage des conteneurs FlowBon..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans
    print_success "Conteneurs démarrés en arrière-plan."
}

# ─── Application des migrations de base de données ──────────────────────────
run_migrations() {
    print_step "Application des migrations de base de données (Alembic)..."

    # Attendre que la base de données soit disponible (max 60 secondes)
    echo "  Attente de la disponibilité de PostgreSQL..."
    for i in $(seq 1 12); do
        if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
            pg_isready -U "${DB_USER:-flowbon}" -d "${DB_NAME:-flowbon}" &>/dev/null; then
            break
        fi
        echo "  Tentative $i/12... (5 secondes)"
        sleep 5
    done

    # Lancer Alembic
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend \
        alembic upgrade head
    print_success "Migrations appliquées avec succès."
}

# ─── Vérification de l'état de santé post-déploiement ───────────────────────
health_check() {
    print_step "Vérification de l'état de santé des services..."
    sleep 5  # Attendre que les services finissent de démarrer

    echo ""
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    echo ""

    # Vérification de l'API
    source "$ENV_FILE"
    if curl -sf "https://${DOMAIN}/api/health" &>/dev/null; then
        print_success "API Backend accessible sur https://${DOMAIN}/api ✓"
    else
        print_warning "L'API n'est pas encore accessible sur https://${DOMAIN}/api."
        print_warning "Vérifiez la configuration DNS et les logs : bash scripts/monitor.sh"
    fi
}

# ─── Rapport final ───────────────────────────────────────────────────────────
print_summary() {
    source "$ENV_FILE"
    echo ""
    echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ Déploiement FlowBon terminé avec succès !${NC}"
    echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}  🌐 Application disponible sur :${NC} https://${DOMAIN}"
    echo -e "${BOLD}  📋 Logs de déploiement sauvegardés :${NC} $LOG_FILE"
    echo ""
    echo -e "${BOLD}  Commandes utiles :${NC}"
    echo -e "   • Voir les logs en temps réel : ${YELLOW}bash scripts/monitor.sh${NC}"
    echo -e "   • Sauvegarder la DB           : ${YELLOW}bash scripts/backup.sh${NC}"
    echo -e "   • Mettre à jour               : ${YELLOW}bash scripts/deploy.sh --update${NC}"
    echo ""
}

# ─── Exécution principale ────────────────────────────────────────────────────
mkdir -p /opt/flowbon/logs

print_header | tee "$LOG_FILE"
preflight_checks

case $MODE in
    deploy)
        pull_images
        start_services
        run_migrations
        health_check
        ;;
    update)
        print_step "Mode mise à jour activé..."
        pull_images
        start_services
        run_migrations
        health_check
        ;;
    restart)
        print_step "Mode redémarrage activé (sans pull d'images)..."
        start_services
        health_check
        ;;
esac

print_summary
