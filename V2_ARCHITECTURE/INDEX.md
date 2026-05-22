# 📚 FlowBon V2 Architecture – Index

Bienvenue dans le dossier `V2_ARCHITECTURE` — voici la feuille de route pour évoluer FlowBon vers une plateforme **Financial Workflow Operating System** scalable et flexible.

---

## 📖 Fichiers de cette documentation

### 0. **[STRUCTURE.md](STRUCTURE.md)** – Vue d'ensemble de tous les fichiers 🗂️
Index complet avec tous les fichiers, organisation, guide de lecture par rôle.

**À lire pour comprendre la structure.**

---

### 1. **[ETAPES_COMPLETE.md](ETAPES_COMPLETE.md)** – Liste complète des 16 étapes ⭐
Guide pratique pour implémenter V2 étape par étape (ÉTAPE 1 à 16).
- 16 étapes détaillées
- Timeline de ~6 mois
- Dépendances claires
- Checklist de suivi

**À consulter pour planifier et suivre la progression.**

---

### 1. **[ROADMAP.md](ROADMAP.md)** – Vue d'ensemble stratégique
- État actuel (V1) et ses lacunes
- Vision V2 clarifiée
- Architecture recommandée (séparation métier/comptabilité)
- Gouvernance et hiérarchie
- 6 phases de développement
- Modules futurs branchables

**À lire en premier** pour comprendre la direction.

---

### 2. **[PHASE_0_DATABASE.md](PHASE_0_DATABASE.md)** – Schéma de données Core Stable
- 5 modèles SQLAlchemy détaillés :
  - `ChartOfAccounts` (plan comptable)
  - `AccountingMappings` (catégorie → compte)
  - `AccountingMappingHistory` (audit)
  - `LedgerEntries` (grand livre)
  - `AccountingTemplates` (templates)
- Migration Alembic complète
- Données seed (SYSCOHADA PME)

**À utiliser** pour implémenter la base de données.

---

### 3. **[PHASE_0_API_SERVICES.md](PHASE_0_API_SERVICES.md)** – Services et Endpoints Phase 0
- Services `accounting_service.py` :
  - `resolve_account_for_expense` (résoudre compte)
  - `create_ledger_entry` (créer écriture)
  - Autres helpers CRUD
- Routes `/accounting` :
  - Gestion plan comptable
  - Gestion mappings
  - Visualisation ledger
- Schemas Pydantic
- Tests unitaires
- Checklist de livraison

**À utiliser** pour développer les endpoints API.

---

### 4. **[ACTION_PLAN.md](ACTION_PLAN.md)** – Jalons et dépendances
- Timeline détaillée (6 sprints)
- 6 jalons majeurs (M0 à M6)
- Dépendances entre phases
- Ressources estimées
- Critères de succès par phase
- Checklist de livraison

**À utiliser** pour planifier le travail et suivre la progression.

---

### 5. **[PLAN_CABINET_TOGO.md](PLAN_CABINET_TOGO.md)** – Adaptation marché cabinet comptable au Togo
- Analyse des besoins locaux
- MVP recommandé
- Solutions anti-fraude et multi-tenant
- Priorités produit pour les cabinets
- Pistes d’implémentation sans coder

**À lire pour aligner V2 sur le marché togolais.**

---

## 🎯 Utilisation rapide

### Pour démarrer Phase 0 immédiatement :
1. Lire [ETAPES_COMPLETE.md](ETAPES_COMPLETE.md) (5 min) → comprendre structure
2. Lire [INDEX.md](INDEX.md) (5 min) → orientation
3. Lire [ROADMAP.md](ROADMAP.md) – sections "État actuel" et "Phase 0"
4. Suivre [ETAPE_2_V2.md](ETAPE_2_V2.md) → commencer à coder
5. Consulter [ACTION_PLAN.md](ACTION_PLAN.md) – Sprint 1 checklist

---

### Pour comprendre l'architecture complète :
1. Lire [ROADMAP.md](ROADMAP.md) en entier
2. Regarder les diagrammes ASCII
3. Consulter la section "Phases de développement"
4. Référer à [ACTION_PLAN.md](ACTION_PLAN.md) pour la timeline

---

### Pour valider avec les comptables :
1. Section "Vision V2" du [ROADMAP.md](ROADMAP.md)
2. Section "Phase 3" du [ROADMAP.md](ROADMAP.md) – génération écritures
3. Données seed SYSCOHADA du [PHASE_0_DATABASE.md](PHASE_0_DATABASE.md)

---

## 🚀 Prochaines étapes

### Cette semaine (Sprint 0)
- [ ] Lire entièrement [ROADMAP.md](ROADMAP.md)
- [ ] Valider direction avec équipe
- [ ] Valider direction avec PME partenaires
- [ ] Assigner backend lead

### Semaine prochaine (Sprint 1)
- [ ] Commencer Phase 0 (modèles et migrations)
- [ ] Utiliser [PHASE_0_DATABASE.md](PHASE_0_DATABASE.md) comme guide
- [ ] Utiliser [PHASE_0_API_SERVICES.md](PHASE_0_API_SERVICES.md) pour endpoints
- [ ] Tracker progression sur [ACTION_PLAN.md](ACTION_PLAN.md)

---

## 💡 Conseils

- ✅ **Lire le ROADMAP en entier** avant de coder — comprendre la vision globale
- ✅ **Valider avec comptables** avant Phase 0 — faire validation métier
- ✅ **Faire Phase 0 d'abord** — ne pas sauter les étapes
- ✅ **Tests 80%+** — la comptabilité ne pardonne pas d'erreurs
- ✅ **Documenter au fur et à mesure** — la comptabilité doit être tracée

---

## 🔗 Références externes

- SYSCOHADA : [https://www.wipo.int/madrid/en/](Plan comptable OHADA)
- FastAPI : [https://fastapi.tiangolo.com/](Docs API)
- SQLAlchemy : [https://docs.sqlalchemy.org/](ORM)
- Alembic : [https://alembic.sqlalchemy.org/](Migrations)

---

## 📞 Questions ?

- **Sur la vision** : Consulter [ROADMAP.md](ROADMAP.md) section "Vision V2"
- **Sur l'architecture** : Consulter [ROADMAP.md](ROADMAP.md) section "Architecture V2"
- **Sur l'implémentation** : Consulter [PHASE_0_DATABASE.md](PHASE_0_DATABASE.md) ou [PHASE_0_API_SERVICES.md](PHASE_0_API_SERVICES.md)
- **Sur la timeline** : Consulter [ACTION_PLAN.md](ACTION_PLAN.md)

---

## ✅ Checklist de compréhension

Avant de commencer à coder, tu dois comprendre :

- [ ] Pourquoi séparer catégories métier et comptes comptables
- [ ] Comment fonctionne `resolve_account_for_expense`
- [ ] Qu'est-ce qu'une écriture comptable (débit/crédit)
- [ ] Comment les templates SYSCOHADA s'appliquent
- [ ] La différence entre les 6 phases
- [ ] Pourquoi la gouvernance est importante
- [ ] Pourquoi la trésorerie doit être extensible

Si une réponse te manque, **relis le ROADMAP**.

---

## 🎉 Fin du setup

Bravo d'être arrivé ici ! Tu as maintenant une **architecture claire, progressive et validée** pour FlowBon V2.

**Prochaine action** : Assigner le backend lead et planifier Sprint 1. 🚀

