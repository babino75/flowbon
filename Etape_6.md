# ETAPE 6 - DASHBOARD ET RAPPORTS

Objectif : donner de la visibilite aux responsables avec des chiffres clairs et exploitables.

Le dashboard est ce qui aide a vendre FlowBon : il montre rapidement que l'entreprise gagne du controle sur ses depenses.

---

# 1. Objectif produit

Un patron, admin ou comptable doit pouvoir comprendre en quelques secondes :

- combien l'entreprise a depense ce mois-ci
- combien de bons sont en attente
- combien de bons sont approuves
- combien reste a payer
- qui demande le plus
- quelles categories coutent le plus

---

# 2. Indicateurs MVP

## Cartes principales (KPI)

```text
Total depenses du mois        (montant total des bons payes)
Bons en attente                (nombre de bons pending)
Bons approuves                 (nombre de bons approved)
Bons payes                     (nombre de bons paid)
Montant restant a payer        (somme des bons approved non payes)
Taux d'approbation             (% de bons approuves vs refuses)
```

## Tableaux utiles

```text
Derniers bons crees            (les 10 derniers)
Bons en attente de validation  (pour action rapide)
Top depenses par categorie     (classement)
Top depenses par employe       (classement)
```

## Graphiques visuels

```text
Courbe des depenses par mois   (evolution sur 6-12 mois)
Camembert par categorie        (repartition)
Barres par statut              (pending, approved, rejected, paid)
```

Librairie recommandee pour les graphiques : Recharts (React) ou Chart.js.

---

# 3. Filtre par periode

Tous les indicateurs doivent etre filtrables par periode :

```text
Cette semaine
Ce mois-ci (defaut)
Ce trimestre
Cette annee
Periode personnalisee (du ... au ...)
```

C'est indispensable. Un comptable qui ne peut voir que le mois en cours est limite. Il doit pouvoir comparer les depenses d'un trimestre a l'autre.

---

# 4. Export des donnees

Meme en MVP, les comptables ont besoin d'exporter les donnees pour les integrer dans leur logiciel comptable.

## Export CSV (minimum)

```text
GET /exports/expenses?format=csv&from=2025-01-01&to=2025-12-31
```

Colonnes du CSV :

```text
Date,Employe,Categorie,Description,Montant,Devise,Statut
2025-03-12,Moussa Diallo,Transport,Taxi client Plateau,5000,XOF,paid
2025-03-13,Fatou Kone,Fournitures,Papier imprimante,12000,XOF,approved
```

## Export PDF (post-MVP)

Un rapport PDF avec les graphiques et les tableaux, generee automatiquement. A ajouter apres le MVP.

---

# 5. Backend

## Routes API

```text
GET /dashboard/summary           → KPI principaux (total, en attente, approuves, payes)
GET /dashboard/recent-expenses   → derniers bons crees
GET /dashboard/by-category       → depenses groupees par categorie
GET /dashboard/by-user           → depenses groupees par employe
GET /dashboard/monthly-trend     → evolution mensuelle sur 12 mois
GET /exports/expenses            → export CSV des bons (avec filtres)
```

## Parametres de filtre communs

```text
?from=2025-01-01     → date de debut
?to=2025-12-31       → date de fin
?period=month        → raccourci (week, month, quarter, year)
```

Toutes les statistiques doivent etre filtrees par `company_id` via les services/repositories d'isolation definis a l'etape 3.

---

# 6. Frontend

## Pages minimum

```text
/dashboard             → vue principale avec KPI + graphiques
/dashboard/reports     → rapports detailles avec filtres avances
```

## Dashboard par role

### Employe
- ses propres stats (nombre de bons, montant total)
- ses derniers bons et leur statut
- raccourci pour creer un nouveau bon

### Manager
- bons en attente de validation (avec action rapide : approuver/refuser)
- stats de son entreprise
- top depenses par categorie

### Comptable
- montant total a payer
- bons approuves a traiter
- bouton d'export CSV
- historique des paiements

### Admin
- vue complete de toute l'entreprise
- tous les graphiques
- tous les exports
- nombre d'utilisateurs actifs

## UX du dashboard

- les KPI doivent etre visibles sans scroller
- les graphiques doivent avoir des couleurs coherentes
- selecteur de periode visible en haut de page
- les tableaux doivent etre paginables et triables
- bouton d'export visible pour les comptables et admins

---

# 7. Checkpoint

A la fin de cette etape :

```text
OK - FlowBon a un dashboard utilisable avec des KPI clairs
OK - les responsables voient les chiffres importants
OK - les indicateurs sont filtrables par periode (semaine, mois, trimestre, annee)
OK - un export CSV des depenses est disponible
OK - des graphiques visuels montrent les tendances
OK - chaque role voit un dashboard adapte a ses besoins
OK - la demo devient beaucoup plus convaincante
```

Quand c'est termine, on passe a :

# ETAPE 7 - NOTIFICATIONS ET EXPERIENCE UTILISATEUR
