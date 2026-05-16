# ETAPE 8 - DEMO COMMERCIALE ET LANCEMENT LOCAL

Objectif : preparer FlowBon pour vendre a de vraies entreprises locales.

Cette etape ne consiste pas seulement a coder. Elle sert a transformer le MVP en offre claire et demonstrable.

---

# 1. Objectif business

Pouvoir montrer FlowBon a un dirigeant, un comptable ou un manager et lui faire comprendre rapidement :

- le probleme resolu
- le gain de temps
- le meilleur controle financier
- le prix
- comment commencer

---

# 2. Script de seed automatique

Creer un script `seed.py` qui peuple automatiquement la base avec des donnees de demo realistes.

```python
# backend/seed.py

"""
Script de seed pour la demo FlowBon.
Lance avec : python seed.py
"""

DEMO_COMPANY = {
    "name": "PME Demo Abidjan",
    "country": "Cote d'Ivoire",
    "city": "Abidjan",
    "default_currency": "XOF",
}

DEMO_USERS = [
    {"name": "Amadou Diallo", "email": "admin@demo.flowbon.com", "role": "admin", "password": "demo1234"},
    {"name": "Fatou Kone", "email": "manager@demo.flowbon.com", "role": "manager", "password": "demo1234"},
    {"name": "Ali Traore", "email": "comptable@demo.flowbon.com", "role": "accountant", "password": "demo1234"},
    {"name": "Moussa Camara", "email": "employe@demo.flowbon.com", "role": "employee", "password": "demo1234"},
]

DEMO_EXPENSES = [
    {"user": "employe@demo.flowbon.com", "amount": 15000, "category": "transport", "description": "Taxi client Plateau", "status": "paid"},
    {"user": "employe@demo.flowbon.com", "amount": 8500, "category": "restauration", "description": "Dejeuner reunion client", "status": "approved"},
    {"user": "employe@demo.flowbon.com", "amount": 45000, "category": "mission_deplacement", "description": "Deplacement Bouake", "status": "pending"},
    {"user": "employe@demo.flowbon.com", "amount": 3200, "category": "achat_fournitures", "description": "Cartouche imprimante", "status": "rejected"},
]
```

Pourquoi c'est essentiel :

- sans seed, tu dois recreer les donnees de demo a la main avant chaque presentation
- avec le seed, une commande suffit pour avoir un environnement de demo propre
- les montants et categories doivent etre realistes pour le marche cible

## Protection des comptes de demo

Ajouter un flag `is_demo` sur les comptes de demo pour empecher leur modification par un prospect :

```python
# Les comptes de demo ne peuvent pas etre supprimes ou modifies
if user.is_demo:
    raise HTTPException(403, "Les comptes de demo ne peuvent pas etre modifies.")
```

---

# 3. Scenario de demo

Preparer un scenario fluide de 5 minutes :

```text
1. Connexion en tant qu'employe (employe@demo.flowbon.com)
   → Creer un bon de transport de 15 000 XOF
   → Ajouter une photo de facture
   → Soumettre le bon

2. Connexion en tant que manager (manager@demo.flowbon.com)
   → Voir la notification du nouveau bon
   → Ouvrir le bon et verifier le justificatif
   → Approuver le bon

3. Connexion en tant que comptable (comptable@demo.flowbon.com)
   → Voir le bon approuve dans la liste des paiements
   → Marquer comme paye

4. Connexion en tant qu'admin (admin@demo.flowbon.com)
   → Voir le dashboard avec les statistiques
   → Voir les graphiques de depenses par categorie
   → Exporter un rapport CSV

5. Conclusion
   → "Tout ca sans papier, sans Excel, en 5 minutes."
```

---

# 4. Landing page

Creer une page d'accueil professionnelle pour FlowBon.

## Pages minimum

```text
/                 → page d'accueil (hero + benefices + CTA)
/pricing          → grille tarifaire
/contact          → formulaire de contact
/demo             → acces a la demo en ligne
```

## Message principal de la page d'accueil

```text
Titre : Gerez vos depenses d'entreprise sans papier ni Excel.
Sous-titre : FlowBon simplifie les demandes, validations et remboursements pour les PME.
CTA : Essayer gratuitement / Demander une demo
```

## Sections de la landing page

1. Hero avec le message principal et un screenshot du dashboard
2. Le probleme (gestion papier, Excel, lenteur)
3. La solution (3 etapes simples avec icones)
4. Les benefices (gain de temps, transparence, controle)
5. Cas d'usage realistes au debut, puis vrais temoignages apres les premiers clients
6. Grille tarifaire
7. FAQ
8. Footer avec liens et contact

---

# 5. Offre de prix MVP

## Grille tarifaire simple

```text
Gratuit (14 jours d'essai)
 - 5 utilisateurs max
 - fonctionnalites completes
 - support par email

Starter — 15 000 XOF/mois (~25 USD)
 - jusqu'a 10 utilisateurs
 - toutes les fonctionnalites
 - support par email
 - export CSV

Business — 35 000 XOF/mois (~55 USD)
 - jusqu'a 50 utilisateurs
 - toutes les fonctionnalites
 - support prioritaire
 - export CSV + PDF
 - statistiques avancees

Enterprise — sur devis
 - utilisateurs illimites
 - personnalisation
 - support dedie
 - integration sur mesure
```

## Paiement MVP

Au debut, le paiement peut etre manuel :

- Mobile Money (Orange Money, Wave, MTN MoMo)
- virement bancaire
- espece contre facture

Le plus important est de vendre et apprendre, pas d'automatiser Stripe trop tot.

## Gestion des abonnements

Meme en mode manuel, il faut tracker :

```text
companies
 - subscription_plan (free, starter, business, enterprise)
 - subscription_status (trial, active, expired, cancelled)
 - trial_ends_at (date de fin d'essai)
 - subscription_ends_at (date de fin d'abonnement)
 - max_users (limite selon le plan)
```

Quand l'abonnement expire, l'acces est restreint (lecture seule) mais les donnees ne sont jamais supprimees.

---

# 6. Materiel commercial

Preparer :

- pitch de 30 secondes (en francais, adapte au contexte local)
- 3 captures d'ecran du dashboard (avec donnees realistes)
- fiche PDF simple (1 page recto/verso)
- liste de 20 entreprises locales a contacter
- formulaire de contact fonctionnel sur la landing page
- video demo de 2 minutes (optionnel mais tres efficace)

## Pitch de 30 secondes

```text
"Aujourd'hui, quand un employe fait une depense pour l'entreprise, 
il faut remplir des papiers, attendre la validation du manager, 
puis relancer la comptabilite pour le remboursement.

FlowBon remplace tout ca par une application simple : 
l'employe prend la facture en photo, le manager valide en un clic, 
et le comptable voit tout dans un tableau de bord clair.

Plus de papier perdu, plus de retard, plus de confusion."
```

---

# 7. Checkpoint

A la fin de cette etape :

```text
OK - un script seed.py peuple la base avec des donnees de demo realistes
OK - les comptes de demo sont proteges contre les modifications
OK - le scenario de demo est prepare et fluide (5 minutes)
OK - une landing page professionnelle existe
OK - la grille tarifaire est claire avec des limites par plan
OK - le pitch de 30 secondes est pret
OK - le materiel commercial est prepare
OK - FlowBon est montrable a un vrai prospect
```

Ensuite, on passe a :

# ETAPE 9 - TESTS, SECURITE ET QUALITE
