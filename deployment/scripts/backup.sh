#!/bin/bash
# =============================================================================
# FlowBon SaaS — Script de Sauvegarde PostgreSQL (backup.sh)
# Version : 1.0
#
# Génère un dump SQL compressé de la base de données FlowBon, stocke les
# sauvegardes dans /opt/flowbon/backups/ et nettoie les anciens fichiers.
#
# USAGE :
#   bash backup.sh               # Sauvegarde manuelle immédiate
#   bash backup.sh --restore     # Mode restauration interactif
#   bash backup.sh --list        # Lister les sauvegardes disponibles
#   bash backup.sh --clean       # Nettoyer les sauvegardes expirées
#
# AUTOMATISATION (cron) :
#   Ajouter cette ligne dans crontab (sudo crontab -e) pour une sauvegarde
#   automatique chaque jour à 2h00 du matin :
#
#   0 2 * * * /bin/bash /opt/flowbon/scripts/backup.sh >> /opt/flowbon/logs/backup_cron.log 2>&1
#
# =============================================================================

set -e

# ─── Variables ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"

BACKUP_DIR="/opt/flowbon/backups"
RETENTION_DAYS=30               # Nombre de jours de conservation des sauvegardes
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="flowbon_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Fonctions utilitaires ───────────────────────────────────────────────────
print_header() {
    echo ""
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  💾 FlowBon SaaS — Sauvegarde Base de Données${NC}"
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}   $(date '+%A %d %B %Y — %H:%M:%S')${NC}"
    echo ""
}

print_step()    { echo -e "${YELLOW}${BOLD}▶ $1${NC}"; }
print_success() { echo -e "${GREEN}  ✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
print_error()   { echo -e "${RED}  ❌ $1${NC}"; exit 1; }

# ─── Chargement des variables d'environnement ────────────────────────────────
load_env() {
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    else
        print_warning ".env non trouvé dans $DEPLOY_DIR. Utilisation des valeurs par défaut."
    fi
    DB_USER="${DB_USER:-flowbon}"
    DB_PASSWORD="${DB_PASSWORD:-flowbon}"
    DB_NAME="${DB_NAME:-flowbon}"
    DB_CONTAINER="flowbon-db"
}

# ─── Vérifications préalables ────────────────────────────────────────────────
preflight_checks() {
    print_step "Vérifications préalables..."

    if ! command -v docker &>/dev/null; then
        print_error "Docker non disponible."
    fi

    if ! docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
        print_error "Conteneur '$DB_CONTAINER' non démarré. Lancez d'abord : bash deploy.sh"
    fi

    mkdir -p "$BACKUP_DIR"
    print_success "Répertoire de sauvegarde : $BACKUP_DIR"
}

# ─── Sauvegarde principale ───────────────────────────────────────────────────
run_backup() {
    print_step "Génération du dump PostgreSQL compressé..."

    # pg_dump avec compression gzip via le conteneur DB (sans image custom)
    docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
        pg_dump -U "$DB_USER" -d "$DB_NAME" --no-password \
        --format=plain --clean --if-exists | gzip > "$BACKUP_PATH"

    # Vérification de l'intégrité
    if [ -f "$BACKUP_PATH" ] && [ -s "$BACKUP_PATH" ]; then
        BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
        print_success "Sauvegarde créée : $BACKUP_FILENAME ($BACKUP_SIZE)"
    else
        print_error "Échec de la sauvegarde. Le fichier est vide ou introuvable."
    fi
}

# ─── Nettoyage des anciennes sauvegardes ─────────────────────────────────────
clean_old_backups() {
    print_step "Nettoyage des sauvegardes de plus de ${RETENTION_DAYS} jours..."

    DELETED_COUNT=$(find "$BACKUP_DIR" -name "flowbon_backup_*.sql.gz" \
        -mtime "+${RETENTION_DAYS}" -print -delete 2>/dev/null | wc -l)

    if [ "$DELETED_COUNT" -gt 0 ]; then
        print_success "$DELETED_COUNT ancienne(s) sauvegarde(s) supprimée(s)."
    else
        print_success "Aucune sauvegarde expirée à nettoyer."
    fi
}

# ─── Lister les sauvegardes disponibles ──────────────────────────────────────
list_backups() {
    echo -e "${BLUE}${BOLD}📋 SAUVEGARDES DISPONIBLES dans $BACKUP_DIR${NC}"
    echo "──────────────────────────────────────────────────────"

    if ls "$BACKUP_DIR"/flowbon_backup_*.sql.gz &>/dev/null; then
        echo ""
        ls -lh "$BACKUP_DIR"/flowbon_backup_*.sql.gz | \
            awk '{printf "  [%s] %-45s %s\n", NR, $9, $5}' | \
            sed 's|.*/||'
        echo ""
        TOTAL=$(ls "$BACKUP_DIR"/flowbon_backup_*.sql.gz 2>/dev/null | wc -l)
        TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
        echo -e "  Total : ${BOLD}$TOTAL sauvegarde(s)${NC} — Taille totale : ${BOLD}$TOTAL_SIZE${NC}"
    else
        echo -e "  ${YELLOW}Aucune sauvegarde trouvée dans $BACKUP_DIR${NC}"
    fi
    echo ""
}

# ─── Mode restauration interactif ────────────────────────────────────────────
restore_backup() {
    echo -e "${YELLOW}${BOLD}🔄 MODE RESTAURATION${NC}"
    echo "──────────────────────────────────────────────────────"
    echo -e "${RED}${BOLD}⚠️  ATTENTION : Cette opération va écraser la base de données actuelle !${NC}"
    echo ""

    list_backups

    if ! ls "$BACKUP_DIR"/flowbon_backup_*.sql.gz &>/dev/null; then
        print_error "Aucune sauvegarde disponible pour la restauration."
    fi

    read -rp "  Entrez le nom exact du fichier à restaurer (ex: flowbon_backup_20260518_020000.sql.gz) : " RESTORE_FILE

    RESTORE_PATH="$BACKUP_DIR/$RESTORE_FILE"
    if [ ! -f "$RESTORE_PATH" ]; then
        print_error "Fichier introuvable : $RESTORE_PATH"
    fi

    read -rp "  Confirmer la restauration depuis '$RESTORE_FILE' ? (tapez 'OUI' pour confirmer) : " CONFIRM
    if [ "$CONFIRM" != "OUI" ]; then
        echo -e "  ${YELLOW}Restauration annulée.${NC}"
        exit 0
    fi

    print_step "Restauration en cours depuis $RESTORE_FILE..."

    # Décompresser et restaurer via le conteneur DB
    gunzip -c "$RESTORE_PATH" | docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DB_CONTAINER" \
        psql -U "$DB_USER" -d "$DB_NAME"

    print_success "Base de données restaurée avec succès depuis $RESTORE_FILE !"
    print_warning "Redémarrez le backend pour prendre en compte la restauration : docker restart flowbon-backend"
}

# ─── Rapport de sauvegarde ───────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ Sauvegarde terminée avec succès !${NC}"
    echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  📁 Fichier : ${BOLD}$BACKUP_PATH${NC}"
    echo -e "  🗓️  Conservation : ${BOLD}${RETENTION_DAYS} jours${NC}"
    echo ""
    echo -e "${BOLD}  Pour automatiser les sauvegardes quotidiennes (2h00) :${NC}"
    echo -e "  ${YELLOW}sudo crontab -e${NC}"
    echo -e "  Ajouter : ${YELLOW}0 2 * * * /bin/bash $SCRIPT_DIR/backup.sh >> /opt/flowbon/logs/backup_cron.log 2>&1${NC}"
    echo ""
}

# ─── Exécution principale ────────────────────────────────────────────────────
print_header
load_env

case "${1:-}" in
    --restore)
        preflight_checks
        restore_backup
        ;;
    --list)
        list_backups
        ;;
    --clean)
        preflight_checks
        clean_old_backups
        ;;
    *)
        preflight_checks
        run_backup
        clean_old_backups
        print_summary
        ;;
esac
