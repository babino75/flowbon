#!/bin/bash
# =============================================================================
# FlowBon SaaS — Script de Préparation de l'Hôte (prepare_host.sh)
# Version : 1.0
#
# Ce script installe et vérifie tous les prérequis système nécessaires pour
# déployer FlowBon sur un serveur Linux Ubuntu/Debian.
#
# USAGE :
#   sudo bash prepare_host.sh
#
# PRÉREQUIS :
#   - Ubuntu 22.04 LTS / 24.04 LTS (ou Debian 12)
#   - Accès root ou sudo
# =============================================================================

set -e  # Arrêt immédiat en cas d'erreur

# ─── Couleurs pour la lisibilité ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Fonctions utilitaires ───────────────────────────────────────────────────
print_header() {
    echo ""
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}${BOLD}  🚀 FlowBon SaaS — Préparation de l'Infrastructure${NC}"
    echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}${BOLD}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
    exit 1
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Ce script doit être exécuté avec les droits root. Utilisez : sudo bash prepare_host.sh"
    fi
}

# ─── Vérification de l'OS ───────────────────────────────────────────────────
check_os() {
    print_step "Vérification du système d'exploitation..."
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VERSION=$VERSION_ID
        print_success "Système détecté : $OS $VERSION"

        if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
            print_warning "OS non officiellement supporté ($OS). Continuez avec précaution."
        fi
    else
        print_warning "Impossible de détecter l'OS. Continuez avec précaution."
    fi
}

# ─── Vérification des ressources système ─────────────────────────────────────
check_resources() {
    print_step "Vérification des ressources matérielles..."

    # RAM
    RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$RAM_MB" -lt 3800 ]; then
        print_warning "RAM disponible : ${RAM_MB} Mo. Minimum recommandé : 4 Go."
    else
        print_success "RAM : ${RAM_MB} Mo ✓"
    fi

    # CPU
    CPU_CORES=$(nproc)
    print_success "CPU : ${CPU_CORES} cœur(s) détecté(s)"
    if [ "$CPU_CORES" -lt 2 ]; then
        print_warning "Minimum 2 vCPU recommandés pour la production."
    fi

    # Espace disque
    DISK_FREE_GB=$(df -BG / | awk 'NR==2{gsub("G","",$4); print $4}')
    if [ "$DISK_FREE_GB" -lt 15 ]; then
        print_warning "Espace disque libre sur / : ${DISK_FREE_GB} Go. Minimum recommandé : 20 Go."
    else
        print_success "Espace disque libre : ${DISK_FREE_GB} Go ✓"
    fi
}

# ─── Mise à jour du système ──────────────────────────────────────────────────
update_system() {
    print_step "Mise à jour des paquets système..."
    apt-get update -qq
    apt-get upgrade -y -qq
    apt-get install -y -qq curl gnupg ca-certificates lsb-release apt-transport-https software-properties-common
    print_success "Système mis à jour."
}

# ─── Installation de Docker Engine ──────────────────────────────────────────
install_docker() {
    print_step "Vérification de Docker Engine..."

    if command -v docker &>/dev/null; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
        print_success "Docker déjà installé : v${DOCKER_VERSION}"
        return
    fi

    print_step "Installation de Docker Engine..."
    # Ajout du dépôt officiel Docker
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    print_success "Docker Engine installé et démarré."
}

# ─── Vérification de Docker Compose ─────────────────────────────────────────
check_compose() {
    print_step "Vérification de Docker Compose v2..."
    if docker compose version &>/dev/null; then
        COMPOSE_VERSION=$(docker compose version --short)
        print_success "Docker Compose v2 disponible : v${COMPOSE_VERSION}"
    else
        print_error "Docker Compose v2 non disponible. Vérifiez l'installation de Docker."
    fi
}

# ─── Configuration du système pour la production ────────────────────────────
configure_system() {
    print_step "Configuration des paramètres système pour la production..."

    # Optimisation mémoire PostgreSQL
    if ! grep -q "vm.overcommit_memory" /etc/sysctl.conf 2>/dev/null; then
        echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf
        sysctl -p -q
        print_success "Optimisation mémoire PostgreSQL appliquée (vm.overcommit_memory=1)."
    else
        print_success "Paramètres sysctl déjà configurés."
    fi

    # Augmentation des limites de fichiers ouverts
    if ! grep -q "flowbon_limits" /etc/security/limits.conf 2>/dev/null; then
        cat >> /etc/security/limits.conf << 'EOF'
# FlowBon SaaS - Limites de fichiers ouverts
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
# flowbon_limits
EOF
        print_success "Limites de fichiers ouverts augmentées (65536)."
    else
        print_success "Limites de fichiers déjà configurées."
    fi
}

# ─── Création de la structure de dossiers ────────────────────────────────────
create_directories() {
    print_step "Création des dossiers de travail FlowBon..."

    DEPLOY_DIR="/opt/flowbon"
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR/backups"
    mkdir -p "$DEPLOY_DIR/logs"

    print_success "Structure créée dans $DEPLOY_DIR"
    print_success "  ├── backups/  (sauvegardes PostgreSQL)"
    print_success "  └── logs/     (logs d'administration)"
}

# ─── Configuration du pare-feu (UFW) ─────────────────────────────────────────
configure_firewall() {
    print_step "Configuration du pare-feu (UFW)..."

    if command -v ufw &>/dev/null; then
        ufw --force enable > /dev/null 2>&1
        ufw allow 22/tcp   > /dev/null 2>&1  # SSH
        ufw allow 80/tcp   > /dev/null 2>&1  # HTTP
        ufw allow 443/tcp  > /dev/null 2>&1  # HTTPS
        ufw allow 443/udp  > /dev/null 2>&1  # HTTP/3 QUIC
        print_success "Pare-feu UFW configuré : ports 22 (SSH), 80 (HTTP), 443 (HTTPS) ouverts."
        print_warning "Ports 5432 (DB), 8000 (API) et 3000 (Frontend) non exposés publiquement. ✓"
    else
        print_warning "UFW non disponible. Configurez votre pare-feu manuellement."
    fi
}

# ─── Rapport final ───────────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}  ✅ Préparation de l'hôte terminée avec succès !${NC}"
    echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BOLD}  Étapes suivantes :${NC}"
    echo -e "  1. Copiez vos fichiers de déploiement dans ${BOLD}/opt/flowbon/${NC}"
    echo -e "  2. Copiez ${BOLD}.env.example${NC} en ${BOLD}.env${NC} et renseignez vos valeurs"
    echo -e "  3. Lancez ${BOLD}sudo bash scripts/deploy.sh${NC}"
    echo ""
}

# ─── Exécution principale ────────────────────────────────────────────────────
print_header
check_root
check_os
check_resources
update_system
install_docker
check_compose
configure_system
create_directories
configure_firewall
print_summary
