#!/bin/bash
# =============================================================================
# FlowBon SaaS — Script de Restauration de Base de Données (restore.sh)
# Version : 1.0
#
# Restaure la base de données PostgreSQL FlowBon depuis une sauvegarde .sql.gz
# générée par backup.sh.
#
# ⚠️  ATTENTION : Cette opération remplace TOUTES les données actuelles par
# celles de la sauvegarde. Elle est IRRÉVERSIBLE sans une nouvelle sauvegarde.
#
# USAGE :
#   bash restore.sh                              # Sélection interactive
#   bash restore.sh FICHIER.sql.gz               # Fichier spécifié directement
#   bash restore.sh --latest                     # Restaurer la dernière sauvegarde
#   bash restore.sh --list                       # Lister les sauvegardes disponibles
#
# EXEMPLE :
#   bash restore.sh flowbon_backup_20260518_020000.sql.gz
#
# =============================================================================

set -e

# ─── Variables ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"
BACKUP_DIR="/opt/flowbon/backups"
DB_CONTAINER="flowbon-db"
BACKEND_CONTAINER="flowbon-backend"

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ─── En-tête ────────────────────────────────────────────────────────────────
print_header() {
    echo ""
    echo -e "${RED}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}${BOLD}  🔄 FlowBon SaaS — Restauration de Base de Données${NC}"
    echo -e "${RED}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${RED}   $(date '+%A %d %B %Y — %H:%M:%S')${NC}"
    echo ""
}

print_step()    { echo -e "${YELLOW}${BOLD}▶ $1${NC}"; }
print_success() { echo -e "${GREEN}  ✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
print_error()   { echo -e "${RED}  ❌ ERREUR : $1${NC}"; exit 1; }
print_info()    { echo -e "${BLUE}  ℹ️  $1${NC}"; }

# ─── Chargement des variables d'environnement ────────────────────────────────
load_env() {
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    else
        print_warning ".env non trouvé. Utilisation des valeurs par défaut."
    fi
    DB_USER="${DB_USER:-flowbon}"
    DB_PASSWORD="${DB_PASSWORD:-flowbon}"
    DB_NAME="${DB_NAME:-flowbon}"
}

# ─── Vérifications préalables ────────────────────────────────────────────────
preflight_checks() {
    print_step "Vérifications préalables..."

    # Docker disponible ?
    if ! command -v docker &>/dev/null; then
        print_error "Docker non disponible sur ce système."
    fi

    # Conteneur DB en cours d'exécution ?
    if ! docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
        print_error "Conteneur '$DB_CONTAINER' non démarré. Lancez d'abord : bash deploy.sh"
    fi
    print_success "Conteneur PostgreSQL '$DB_CONTAINER' opérationnel."

    # Connexion à la base de données ?
    if ! docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
            pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
        print_error "PostgreSQL ne répond pas. Vérifiez les logs : docker logs $DB_CONTAINER"
    fi
    print_success "Connexion PostgreSQL vérifiée."

    # Répertoire de sauvegardes ?
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/*.sql.gz 2>/dev/null)" ]; then
        print_error "Aucune sauvegarde trouvée dans $BACKUP_DIR. Lancez d'abord : bash backup.sh"
    fi
    print_success "Répertoire de sauvegardes trouvé : $BACKUP_DIR"
}

# ─── Lister les sauvegardes disponibles ──────────────────────────────────────
list_backups() {
    echo ""
    echo -e "${BLUE}${BOLD}📋 SAUVEGARDES DISPONIBLES${NC}"
    echo "──────────────────────────────────────────────────────"

    local INDEX=1
    AVAILABLE_BACKUPS=()

    # Trier par date (plus récent en premier)
    while IFS= read -r file; do
        AVAILABLE_BACKUPS+=("$file")
        BASENAME=$(basename "$file")
        SIZE=$(du -sh "$file" | cut -f1)
        DATE_STR=$(echo "$BASENAME" | grep -oP '\d{8}_\d{6}' | \
            sed 's/\(....\)\(..\)\(..\)_\(..\)\(..\)\(..\)/\3\/\2\/\1 \4:\5:\6/')
        printf "  ${YELLOW}%2d)${NC} %-45s %6s   %s\n" "$INDEX" "$BASENAME" "$SIZE" "$DATE_STR"
        ((INDEX++))
    done < <(ls -t "$BACKUP_DIR"/flowbon_backup_*.sql.gz 2>/dev/null)

    echo ""
    BACKUP_COUNT=${#AVAILABLE_BACKUPS[@]}
    echo -e "  Total : ${BOLD}$BACKUP_COUNT sauvegarde(s)${NC}"
    echo ""
}

# ─── Sélection de la sauvegarde ──────────────────────────────────────────────
select_backup() {
    local SPECIFIED_FILE="${1:-}"

    if [ -n "$SPECIFIED_FILE" ]; then
        # Fichier spécifié en argument
        if [[ "$SPECIFIED_FILE" = /* ]]; then
            RESTORE_PATH="$SPECIFIED_FILE"
        else
            RESTORE_PATH="$BACKUP_DIR/$SPECIFIED_FILE"
        fi

        if [ ! -f "$RESTORE_PATH" ]; then
            print_error "Fichier introuvable : $RESTORE_PATH"
        fi
    elif [ "${1:-}" = "--latest" ]; then
        # Restaurer automatiquement la plus récente
        RESTORE_PATH=$(ls -t "$BACKUP_DIR"/flowbon_backup_*.sql.gz 2>/dev/null | head -1)
        if [ -z "$RESTORE_PATH" ]; then
            print_error "Aucune sauvegarde disponible."
        fi
        print_info "Sauvegarde la plus récente sélectionnée : $(basename "$RESTORE_PATH")"
    else
        # Sélection interactive
        list_backups

        if [ "${#AVAILABLE_BACKUPS[@]}" -eq 0 ]; then
            print_error "Aucune sauvegarde disponible dans $BACKUP_DIR."
        fi

        read -rp "  Entrez le numéro de la sauvegarde à restaurer (ou 'q' pour quitter) : " CHOICE

        if [ "$CHOICE" = "q" ]; then
            echo -e "  ${YELLOW}Restauration annulée.${NC}"
            exit 0
        fi

        if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "${#AVAILABLE_BACKUPS[@]}" ]; then
            print_error "Numéro invalide : $CHOICE"
        fi

        RESTORE_PATH="${AVAILABLE_BACKUPS[$((CHOICE-1))]}"
    fi

    RESTORE_FILENAME=$(basename "$RESTORE_PATH")
    RESTORE_SIZE=$(du -sh "$RESTORE_PATH" | cut -f1)
}

# ─── Confirmation de sécurité ─────────────────────────────────────────────────
safety_confirmation() {
    echo ""
    echo -e "${RED}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}${BOLD}║         ⚠️  AVERTISSEMENT DE SÉCURITÉ CRITIQUE        ║${NC}"
    echo -e "${RED}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Vous êtes sur le point de ${RED}${BOLD}REMPLACER DÉFINITIVEMENT${NC} la base"
    echo -e "  de données ${BOLD}${DB_NAME}${NC} par la sauvegarde suivante :"
    echo ""
    echo -e "    📦 Fichier : ${BOLD}$RESTORE_FILENAME${NC}"
    echo -e "    📏 Taille  : ${BOLD}$RESTORE_SIZE${NC}"
    echo ""
    echo -e "  ${RED}TOUTES les données actuelles seront perdues et${NC}"
    echo -e "  ${RED}remplacées par celles de cette sauvegarde.${NC}"
    echo ""

    # Sauvegarde de précaution proposée
    read -rp "  $(echo -e "${YELLOW}${BOLD}Créer une sauvegarde de sécurité avant de continuer ? (recommandé) [O/n] :${NC} ")" SAVE_FIRST
    if [[ "${SAVE_FIRST:-O}" =~ ^[Oo]$ ]]; then
        print_step "Création d'une sauvegarde de sécurité de l'état actuel..."
        SAFETY_BACKUP="$BACKUP_DIR/flowbon_backup_AVANT_RESTAURATION_$(date +%Y%m%d_%H%M%S).sql.gz"
        docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
            pg_dump -U "$DB_USER" -d "$DB_NAME" --no-password \
            --format=plain --clean --if-exists | gzip > "$SAFETY_BACKUP"
        print_success "Sauvegarde de sécurité créée : $(basename "$SAFETY_BACKUP")"
    fi

    echo ""
    echo -e "  Pour confirmer, tapez exactement : ${BOLD}RESTAURER${NC}"
    read -rp "  Confirmation : " CONFIRM

    if [ "$CONFIRM" != "RESTAURER" ]; then
        echo ""
        echo -e "  ${YELLOW}Restauration annulée. Aucune donnée n'a été modifiée.${NC}"
        exit 0
    fi
    echo ""
}

# ─── Arrêt du backend pendant la restauration ────────────────────────────────
stop_backend() {
    print_step "Arrêt temporaire du backend pendant la restauration..."
    if docker ps --format "{{.Names}}" | grep -q "^${BACKEND_CONTAINER}$"; then
        docker stop "$BACKEND_CONTAINER" > /dev/null
        print_success "Backend arrêté temporairement."
        BACKEND_WAS_RUNNING=true
    else
        BACKEND_WAS_RUNNING=false
    fi
}

# ─── Restauration principale ─────────────────────────────────────────────────
run_restore() {
    print_step "Restauration en cours depuis $RESTORE_FILENAME..."

    # Vérifier l'intégrité du fichier gzip
    if ! gunzip -t "$RESTORE_PATH" 2>/dev/null; then
        print_error "Le fichier de sauvegarde est corrompu : $RESTORE_PATH"
    fi
    print_success "Intégrité du fichier vérifiée (gzip valide)."

    # Décompresser et injecter dans PostgreSQL
    gunzip -c "$RESTORE_PATH" | \
        docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
        psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 --quiet

    print_success "Données restaurées avec succès depuis $RESTORE_FILENAME !"
}

# ─── Redémarrage du backend ───────────────────────────────────────────────────
restart_backend() {
    if [ "${BACKEND_WAS_RUNNING:-false}" = "true" ]; then
        print_step "Redémarrage du backend..."
        docker start "$BACKEND_CONTAINER" > /dev/null
        sleep 3
        if docker ps --format "{{.Names}}" | grep -q "^${BACKEND_CONTAINER}$"; then
            print_success "Backend redémarré et opérationnel."
        else
            print_warning "Backend redémarré mais vérifiez son état : docker logs $BACKEND_CONTAINER"
        fi
    fi
}

# ─── Rapport final ───────────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ Restauration terminée avec succès !${NC}"
    echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  📦 Sauvegarde restaurée : ${BOLD}$RESTORE_FILENAME${NC}"
    echo -e "  🕐 Timestamp            : ${BOLD}$(date '+%d/%m/%Y à %H:%M:%S')${NC}"
    echo ""
    echo -e "${BOLD}  Vérifications recommandées :${NC}"
    echo -e "   • Accéder à l'application et vérifier les données"
    echo -e "   • Consulter les logs backend : ${YELLOW}bash scripts/monitor.sh --logs backend${NC}"
    echo -e "   • Vérifier la DB : ${YELLOW}bash scripts/monitor.sh --db${NC}"
    echo ""
}

# ─── Exécution principale ────────────────────────────────────────────────────
print_header
load_env

case "${1:-}" in
    --list)
        list_backups
        exit 0
        ;;
    --latest)
        preflight_checks
        AVAILABLE_BACKUPS=()
        while IFS= read -r f; do AVAILABLE_BACKUPS+=("$f"); done < <(ls -t "$BACKUP_DIR"/flowbon_backup_*.sql.gz 2>/dev/null)
        select_backup "--latest"
        safety_confirmation
        stop_backend
        run_restore
        restart_backend
        print_summary
        ;;
    "")
        preflight_checks
        # Charger la liste pour la sélection interactive
        AVAILABLE_BACKUPS=()
        while IFS= read -r f; do AVAILABLE_BACKUPS+=("$f"); done < <(ls -t "$BACKUP_DIR"/flowbon_backup_*.sql.gz 2>/dev/null)
        select_backup
        safety_confirmation
        stop_backend
        run_restore
        restart_backend
        print_summary
        ;;
    *)
        # Fichier passé directement en argument
        preflight_checks
        AVAILABLE_BACKUPS=()
        select_backup "$1"
        safety_confirmation
        stop_backend
        run_restore
        restart_backend
        print_summary
        ;;
esac
