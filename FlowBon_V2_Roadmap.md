# 🚀 Feuille de Route FlowBon V2 (Roadmap)
*Ce document consigne les recommandations et orientations stratégiques pour la Version 2 (V2) de FlowBon, inspirées de l'analyse comparative avec N2F et adaptées aux réalités des PME et startups africaines.*

---

## 🎯 Vision & Positionnement de la V2

FlowBon V2 doit conserver son **Superpouvoir** : **la simplicité et le rapprochement physique des avances de caisse (très fréquent en zone CFA)**, tout en intégrant les meilleures fonctionnalités d'automatisation des géants du secteur (comme N2F) pour devenir une solution incontournable.

---

## 🛠️ Les 4 Piliers Fonctionnels de FlowBon V2

### 📸 Pilier 1 : Numérisation & Lecture Automatique par IA (OCR)
*L'objectif est d'éliminer la saisie manuelle fastidieuse pour les employés.*
- **Scan Intelligent :** Intégration d'une API de reconnaissance de documents (ex: Google Document AI, Mindee, ou Azure Form Recognizer).
- **Remplissage automatique :** Lorsque l'utilisateur prend en photo ou uploade un reçu (PDF/PNG/JPG), l'IA extrait automatiquement :
  - Le montant TTC.
  - La date de la dépense.
  - La catégorie estimée (ex: "Carburant" si Total/Ola, "Restauration" si restaurant).
  - La TVA (si applicable).
  - Le nom du fournisseur.

---

### ⚖️ Pilier 2 : Archivage Légal & Valeur Probante
*Permettre aux entreprises de détruire légalement les justificatifs papier.*
- **Conformité Fiscale :** Mettre en place un système de signature numérique des justificatifs avec horodatage certifié.
- **Zéro Papier :** Les justificatifs scannés et stockés dans FlowBon auront la même valeur juridique que les originaux papier lors des audits fiscaux locaux.

---

### 🚗 Pilier 3 : Module d'Indemnités Kilométriques (IK)
*Simplifier le remboursement des frais de déplacement professionnels des employés utilisant leur véhicule personnel.*
- **Intégration Cartographique :** Intégration d'un mini-module d'itinéraire (via OpenStreetMap ou Google Maps API) pour calculer précisément la distance parcourue.
- **Barème Configurable :** Permettre à l'administrateur de définir le coût au kilomètre selon le type de véhicule (moto, voiture 4 CV, voiture 7 CV...) en conformité avec la réglementation locale.

---

### 💳 Pilier 4 : Application Mobile Dédiée & Paiements Locaux (Mobile Money)
- **App Native ou PWA avancée :** Une application mobile légère disponible sur Android et iOS permettant de prendre en photo les reçus même en mode hors-ligne.
- **Intégration Mobile Money (OM / MoMo / Wave) :**
  - **Pour l'avance :** Possibilité pour le comptable de décaisser l'avance directement sur le compte Mobile Money de l'employé depuis la plateforme.
  - **Pour la restitution :** Possibilité pour l'employé de restituer le solde restant via Mobile Money pour clore son dossier de rapprochement.

---

## 💰 Évolution de la Stratégie Tarifaire (V2)

Pour rester hautement compétitif face à N2F tout en maximisant la rentabilité :

| Offre / Pack | Limites d'utilisateurs | Fonctionnalités incluses | Tarif mensuel ciblé |
| :--- | :--- | :--- | :--- |
| **Starter** | Jusqu'à 10 utilisateurs | Avances, dépenses standard, multi-devises, validation simple | **15 000 XOF** |
| **Business** | Jusqu'à 50 utilisateurs | Tout le Starter + Rapports avancés + Export comptable | **35 000 XOF** |
| **Premium (V2 IA)** | Jusqu'à 100 utilisateurs | Tout le Business + **Lecture OCR (IA) + Indemnités Kilométriques** | **75 000 XOF** |
| **Enterprise** | Illimité | Tout le Premium + **Archivage à Valeur Probante + API d'intégration ERP** | **Sur devis** |

---

## 📋 Prochaines Étapes pour le Développement

1. **Validation Commerciale (V1) :** Signer les 3 premiers clients pilotes sur la V1 actuelle pour valider l'expérience du rapprochement financier.
2. **Spécification Technique du module OCR :** Tester la précision d'API de lecture automatique de factures sur des reçus locaux (factures de supermarchés, reçus de taxi, reçus de carburant).
3. **Sécurité & Chiffrement :** Renforcer l'infrastructure de stockage des justificatifs pour préparer l'archivage légal.
