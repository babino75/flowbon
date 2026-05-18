#!/bin/bash
# =============================================================================
# FlowBon SaaS — Script de Monitoring, Audit et Debug (monitor.sh)
# Version : 1.0
#
# Outil interactif pour surveiller l'état de la plateforme FlowBon en
# production : état des conteneurs, logs, ressources, diagnostics réseau.
#
# USAGE :
#   bash monitor.sh              # Menu interactif
#   bash monitor.sh --status     # État rapide des conteneurs
#   bash monitor.sh --logs       # Logs en temps réel (tous les services)
#   bash monitor.sh --logs backend  # Logs d'un service spécifique
#   bash monitor.sh --resources  # Utilisation CPU/RAM/Disque
#   bash monitor.sh --db         # Diagnostics PostgreSQL
# =============================================================================

set -e

# ─── Variables ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
ENV_FILE="$DEPLOY_DIR/.env"

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── En-tête ────────────────────────────────────────────────────────────────
print_header() {
    clear
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  🔍 FlowBon SaaS — Console de Monitoring${NC}"
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $(date '+%A %d %B %Y — %H:%M:%S')${NC}"
    echo ""
}

# ─── Vérification du fichier Compose ─────────────────────────────────────────
check_compose() {
    if [ ! -f "$COMPOSE_FILE" ]; then
        echo -e "${RED}❌ Fichier Compose introuvable : $COMPOSE_FILE${NC}"
        exit 1
    fi
    ENV_ARGS=""
    if [ -f "$ENV_FILE" ]; then
        ENV_ARGS="--env-file $ENV_FILE"
    fi
}

# ─── Alias de commande Compose ───────────────────────────────────────────────
dc() {
    docker compose -f "$COMPOSE_FILE" $ENV_ARGS "$@"
}

# ─── 1. État des conteneurs ──────────────────────────────────────────────────
show_status() {
    echo -e "${CYAN}${BOLD}📦 ÉTAT DES CONTENEURS${NC}"
    echo "──────────────────────────────────────────────────────"
    dc ps
    echo ""

    echo -e "${CYAN}${BOLD}🌡️  RESSOURCES EN TEMPS RÉEL${NC}"
    echo "──────────────────────────────────────────────────────"
    docker stats --no-stream --format \
        "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
}

# ─── 2. Logs en temps réel ──────────────────────────────────────────────────
show_logs() {
    SERVICE="${1:-}"
    echo -e "${CYAN}${BOLD}📜 LOGS EN TEMPS RÉEL${NC} $([ -n "$SERVICE" ] && echo "(Service : $SERVICE)" || echo "(Tous les services)")"
    echo -e "${YELLOW}  Appuyez sur Ctrl+C pour quitter les logs.${NC}"
    echo "──────────────────────────────────────────────────────"
    if [ -n "$SERVICE" ]; then
        dc logs -f --tail=100 "$SERVICE"
    else
        dc logs -f --tail=50
    fi
}

# ─── 3. Utilisation des ressources système ───────────────────────────────────
show_resources() {
    echo -e "${CYAN}${BOLD}🖥️  RESSOURCES SYSTÈME${NC}"
    echo "──────────────────────────────────────────────────────"

    echo -e "${BOLD}── CPU & RAM :${NC}"
    echo "  $(nproc) cœur(s) CPU disponible(s)"
    free -h | awk 'NR==1{print "  " $0} NR==2{print "  " $0}'
    echo ""

    echo -e "${BOLD}── Disque :${NC}"
    df -h / | awk 'NR==1{print "  " $0} NR==2{print "  " $0}'
    echo ""

    echo -e "${BOLD}── Volumes Docker FlowBon :${NC}"
    docker volume ls --filter "name=flowbon_" --format "  {{.Name}}\t{{.Driver}}"
    echo ""

    echo -e "${BOLD}── Utilisation des volumes (taille) :${NC}"
    for vol in flowbon_pgdata flowbon_uploads flowbon_caddy_data; do
        SIZE=$(docker run --rm -v "${vol}:/vol" alpine du -sh /vol 2>/dev/null | cut -f1 || echo "N/A")
        echo "  $vol : $SIZE"
    done
    echo ""
}

# ─── 4. Diagnostics PostgreSQL ───────────────────────────────────────────────
show_db_diagnostics() {
    echo -e "${CYAN}${BOLD}🐘 DIAGNOSTICS POSTGRESQL${NC}"
    echo "──────────────────────────────────────────────────────"

    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    fi
    DB_USER="${DB_USER:-flowbon}"
    DB_NAME="${DB_NAME:-flowbon}"

    echo -e "${BOLD}── Connexion à la base de données :${NC}"
    if dc exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; then
        echo -e "  ${GREEN}✅ PostgreSQL répond correctement.${NC}"
    else
        echo -e "  ${RED}❌ PostgreSQL ne répond pas !${NC}"
        return
    fi

    echo ""
    echo -e "${BOLD}── Taille de la base de données :${NC}"
    dc exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME')) AS taille_totale;" 2>/dev/null | grep -v "^$" | sed 's/^/  /'

    echo ""
    echo -e "${BOLD}── Tables les plus volumineuses :${NC}"
    dc exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text)) AS taille
         FROM pg_tables WHERE schemaname = 'public'
         ORDER BY pg_total_relation_size(tablename::text) DESC LIMIT 10;" 2>/dev/null | sed 's/^/  /'

    echo ""
    echo -e "${BOLD}── Connexions actives :${NC}"
    dc exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT count(*) AS connexions_actives FROM pg_stat_activity WHERE state='active';" 2>/dev/null | sed 's/^/  /'
    echo ""
}

# ─── 5. Diagnostics réseau & HTTPS ───────────────────────────────────────────
show_network() {
    echo -e "${CYAN}${BOLD}🌐 DIAGNOSTICS RÉSEAU${NC}"
    echo "──────────────────────────────────────────────────────"

    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    fi

    echo -e "${BOLD}── Ports exposés :${NC}"
    ss -tlnp 2>/dev/null | grep -E "80|443" | sed 's/^/  /' || netstat -tlnp 2>/dev/null | grep -E "80|443" | sed 's/^/  /'
    echo ""

    echo -e "${BOLD}── Réseau Docker interne FlowBon :${NC}"
    docker network inspect flowbon-net --format \
        "  Réseau: {{.Name}} | Driver: {{.Driver}} | Subnet: {{range .IPAM.Config}}{{.Subnet}}{{end}}" 2>/dev/null || echo "  Réseau flowbon-net non trouvé."
    echo ""

    if [ -n "${DOMAIN:-}" ]; then
        echo -e "${BOLD}── Test HTTPS sur $DOMAIN :${NC}"
        if curl -sf --max-time 5 "https://${DOMAIN}/api/health" &>/dev/null; then
            echo -e "  ${GREEN}✅ https://${DOMAIN}/api/health répond correctement.${NC}"
        else
            echo -e "  ${YELLOW}⚠️  https://${DOMAIN}/api/health ne répond pas (DNS, Caddy ou backend ?)${NC}"
        fi
    fi
    echo ""
}

# ─── 6. Logs Caddy (HTTPS/accès) ─────────────────────────────────────────────
show_caddy_logs() {
    echo -e "${CYAN}${BOLD}🔐 LOGS D'ACCÈS HTTPS (Caddy — 100 dernières lignes)${NC}"
    echo "──────────────────────────────────────────────────────"
    dc logs --tail=100 caddy
    echo ""
}

# ─── 7. Rapport complet de santé ─────────────────────────────────────────────
full_report() {
    REPORT_FILE="/opt/flowbon/logs/health_report_$(date +%Y%m%d_%H%M%S).log"
    {
        date
        echo "=== RAPPORT COMPLET DE SANTÉ FlowBon ==="
        show_status
        show_resources
        show_db_diagnostics
        show_network
    } | tee "$REPORT_FILE"
    echo -e "${GREEN}✅ Rapport sauvegardé : $REPORT_FILE${NC}"
}

# ─── Menu interactif ─────────────────────────────────────────────────────────
interactive_menu() {
    while true; do
        print_header
        echo -e "  ${BOLD}Que souhaitez-vous faire ?${NC}"
        echo ""
        echo -e "  ${YELLOW}1)${NC} 📦 État des conteneurs & ressources"
        echo -e "  ${YELLOW}2)${NC} 📜 Logs en temps réel (tous les services)"
        echo -e "  ${YELLOW}3)${NC} 📜 Logs d'un service spécifique"
        echo -e "  ${YELLOW}4)${NC} 🖥️  Ressources système & volumes"
        echo -e "  ${YELLOW}5)${NC} 🐘 Diagnostics PostgreSQL"
        echo -e "  ${YELLOW}6)${NC} 🌐 Diagnostics réseau & HTTPS"
        echo -e "  ${YELLOW}7)${NC} 🔐 Logs d'accès HTTPS (Caddy)"
        echo -e "  ${YELLOW}8)${NC} 📊 Rapport complet de santé (sauvegardé)"
        echo -e "  ${YELLOW}9)${NC} 🔄 Redémarrer un service"
        echo -e "  ${YELLOW}0)${NC} ❌ Quitter"
        echo ""
        read -rp "  Votre choix : " CHOICE

        case $CHOICE in
            1) print_header; show_status; read -rp "Appuyez sur Entrée..." ;;
            2) show_logs ;;
            3)
                echo -e "\n  Services disponibles : ${BOLD}db backend frontend caddy${NC}"
                read -rp "  Nom du service : " SVC
                show_logs "$SVC"
                ;;
            4) print_header; show_resources; read -rp "Appuyez sur Entrée..." ;;
            5) print_header; show_db_diagnostics; read -rp "Appuyez sur Entrée..." ;;
            6) print_header; show_network; read -rp "Appuyez sur Entrée..." ;;
            7) print_header; show_caddy_logs; read -rp "Appuyez sur Entrée..." ;;
            8) print_header; full_report; read -rp "Appuyez sur Entrée..." ;;
            9)
                echo -e "\n  Services : ${BOLD}db backend frontend caddy${NC}"
                read -rp "  Service à redémarrer : " SVC
                echo -e "  Redémarrage de ${BOLD}$SVC${NC}..."
                dc restart "$SVC"
                echo -e "  ${GREEN}✅ $SVC redémarré.${NC}"
                read -rp "Appuyez sur Entrée..."
                ;;
            0) echo ""; exit 0 ;;
            *) echo -e "${RED}  Choix invalide.${NC}"; sleep 1 ;;
        esac
    done
}

# ─── Exécution ───────────────────────────────────────────────────────────────
check_compose

case "${1:-}" in
    --status)    print_header; show_status ;;
    --logs)      show_logs "${2:-}" ;;
    --resources) print_header; show_resources ;;
    --db)        print_header; show_db_diagnostics ;;
    --network)   print_header; show_network ;;
    --report)    print_header; full_report ;;
    *)           interactive_menu ;;
esac
