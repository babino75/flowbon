# 💳 FlowBon — Identité du Produit & Présentation Commerciale

Bienvenue dans le document officiel de présentation de **FlowBon**, la plateforme SaaS de pointe dédiée à la maîtrise absolue de la petite caisse, au suivi des dépenses d'entreprise et à la gestion des avances collaborateur en temps réel.

Ce document est conçu comme un **kit de vente et de présentation** pour introduire FlowBon auprès de futurs clients, partenaires, Directeurs Financiers (DAF) et experts-comptables exigeants.

---

## I. Qu’est-ce que FlowBon ? (L'Essence du Produit)

**FlowBon** est une solution web et mobile moderne qui résout l'un des plus grands cauchemars des dirigeants, comptables et collaborateurs : **le chaos de la gestion de la petite caisse, de la trésorerie physique et des notes de frais.**

Plutôt que d'utiliser des fichiers Excel fastidieux, des reçus papier éparpillés ou des processus de validation par e-mail désordonnés, FlowBon centralise et sécurise l'ensemble du cycle de vie des flux financiers physiques d'une entreprise.

### 🌟 La Promesse de FlowBon
* **Pour les Dirigeants** : Une visibilité à 360° en temps réel sur les soldes de caisse et les dépenses opérationnelles de l'entreprise.
* **Pour les Experts-Comptables & DAF** : Un contrôle rigoureux, une intégrité absolue des données et une traçabilité totale grâce à l'application stricte du principe de *Segregation of Duties* (Séparation des Tâches). Fini les anomalies lors des clôtures.
* **Pour les Collaborateurs** : Une interface intuitive pour soumettre des reçus en 5 secondes, suivre leurs demandes d'avance et être notifiés de l'avancement en temps réel.

---

## II. L'Écosystème des Rôles (Séparation Stricte des Tâches - SoD)

Pour satisfaire aux exigences d'audit IT et financier les plus strictes, FlowBon intègre un système de droits **RBAC (Role-Based Access Control)** cloisonné. Chaque acteur a un rôle précis, garantissant l'absence de conflit d'intérêts financier.

1. **🧑‍💻 Employé (Collaborateur)**
   * **Rôle** : Saisir les dépenses et demander des avances.
   * **Périmètre** : Ne voit et n'interagit qu'avec ses propres notes de frais et reçus.
2. **👔 Manager (Approbateur Opérationnel)**
   * **Rôle** : Valider la pertinence business d'une dépense.
   * **Périmètre** : Approuve ou rejette les bons soumis par les employés de son équipe. Il contrôle le budget métier, mais pas la conformité comptable.
3. **📊 Comptable (Contrôleur Financier & Expert)**
   * **Rôle** : Vérifier la conformité de la dépense (reçu conforme, TVA, catégorie, exercice comptable). C'est le garant de la loi.
   * **Périmètre** : Il "Vise" les bons approuvés par les managers. Le comptable a le pouvoir de rejeter un bon et de forcer la correction (le système alertera l'employé et le manager). Si l'entreprise n'a pas de caissier physique, le comptable peut également autoriser le décaissement.
4. **🏦 Caissier (Maître de la Trésorerie Physique)**
   * **Rôle** : Gestionnaire exclusif des espèces et des flux physiques.
   * **Périmètre** : Il ne peut payer QUE les bons ayant été préalablement validés (Manager) ET visés (Comptabilité). Le caissier dispose d'un **Tableau de bord absolu** lui permettant de suivre son solde de caisse et l'historique complet de tous les décaissements, sans restriction de date, garantissant que sa caisse physique correspond toujours à la caisse virtuelle. C'est l'application ultime de la séparation entre l'ordonnateur et le payeur.
5. **⚙️ Administrateur / IT**
   * **Rôle** : Paramétrage de la société (catégories, utilisateurs, sécurité).
   * **Périmètre** : Configuration globale sans aucun pouvoir d'approbation sur les flux financiers normaux (garantie d'audit).

---

## III. Liste Exhaustive des Fonctionnalités Actuelles

FlowBon est aujourd'hui une plateforme pleinement opérationnelle, robuste et dotée d'une interface utilisateur premium :

### 1. Circuit de Validation Intelligent & Notifications Ciblées
* **Workflow d'Approbation** : `Brouillon` ➔ `En attente` (Action Manager) ➔ `Visé` (Action Comptable) ➔ `Payé` (Action Caissier).
* **Notifications Intelligentes (Zéro Spam)** : Le système notifie précisément l'acteur concerné (ex: les managers sont alertés en priorité). Si la comptabilité rejette un bon validé à tort, le système prévient l'employé pour correction ET notifie le manager de son erreur de validation.
* **Gestion des "Bons Rejetés" (Exclusivité UX)** : Un espace dédié permet aux collaborateurs de voir immédiatement les motifs de rejet émis par la comptabilité, de corriger la pièce jointe ou le montant, et de resoumettre le bon en un clic.

### 2. Tableaux de Bord Sur Mesure (Dashboard)
* **Pour le Comptable** : Vue analytique avec des graphiques de tendances mensuelles et une répartition par catégorie de dépenses.
* **Pour le Caissier** : Vue opérationnelle absolue avec un compteur exact du "Total Décaissé" et des "Bons visés en attente de paiement", affichant la réalité mathématique de la caisse physique à l'instant T.

### 3. Journal de Caisse & Suivi en Temps Réel
* **Multi-caisses physique** : Possibilité de configurer et suivre plusieurs caisses indépendantes.
* **Opérations de Caisse sécurisées** : Approvisionnement manuel (Bon d'Entrée) et décaissement ponctuel (Bon de Sortie) avec sélection de "Sources de Caisse".
* **Journal d'audit IT** : Historique complet, chronologique et infalsifiable de toutes les transactions (qui a approuvé, quand, et pourquoi).

### 4. Gestion des Avances de Caisse
* **Demande d'avance** : Les collaborateurs peuvent solliciter des fonds avant d'effectuer un achat professionnel.
* **Justification & Apurement** : Suivi rigoureux de l'utilisation de l'avance. L'employé doit présenter des factures pour justifier l'usage des fonds, facilitant le travail de lettrage du comptable.

### 5. Intégrité Fiscale : La Gestion des Exercices Comptables
* **Périodicité stricte** : Définition des dates de début et de fin de l'exercice comptable en cours.
* **Blocage préventif des erreurs** : Le système empêche physiquement et logiquement (côté Serveur et Base de données) toute saisie de transaction dont la date est en dehors de l'exercice comptable actif. Une garantie absolue pour l'expert-comptable lors de ses bilans.

### 6. Architecture Multi-Tenant (SaaS Sécurisé)
* **Cloisonnement total des données** : Chaque entreprise cliente évolue dans son propre espace hermétique. L'isolation est renforcée au niveau du backend et des bases de données.

---

## IV. Pourquoi l'Expert-Comptable va adorer FlowBon ?

Le marché regorge d'outils de notes de frais (souvent trop complexes), mais FlowBon se distingue par sa **rigueur comptable native** :

1. **La fin de la "boîte à chaussures"** : Toutes les pièces jointes (factures, reçus) sont numérisées et associées de façon permanente à la transaction. Fini la perte de documents !
2. **Pré-saisie garantie** : Les dépenses arrivent au service comptable déjà catégorisées et validées par les managers métiers. Le comptable n'a plus qu'à "Viser" et contrôler la TVA.
3. **Le principe du "Garde-Fou"** : Le verrouillage des dates via l'Exercice Comptable empêche les employés de saisir par erreur une facture de décembre 2024 en plein mois de janvier 2025.
4. **Export Propre** : Les données sont structurées et prêtes à être intégrées dans le logiciel de production comptable du cabinet.

---

## V. Fiche Technique & IT de la Solution

* **Frontend** : Next.js 16 (React), Tailwind CSS (Interface fluide, animée, responsive et ultra-premium).
* **Backend** : FastAPI (Python) — performant, asynchrone, validation stricte des données avec Pydantic.
* **Base de Données** : PostgreSQL pour une intégrité transactionnelle absolue.
* **Déploiement** : Docker & Docker Compose permettant un déploiement instantané en local, sur un serveur privé (VPS) ou sur des services cloud.

