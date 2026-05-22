# Plan d'adaptation FlowBon V2 pour les cabinets comptables au Togo

## 🎯 Objectif
Adapter le plan V2 pour répondre aux besoins réels des cabinets comptables togolais, sans coder immédiatement, mais en définissant les solutions qui faciliteront l’onboarding des futurs clients.

## 1. Contexte marché

Les cabinets comptables au Togo gèrent principalement :
- tenue de comptabilité
- déclarations fiscales OTR
- paie et déclarations sociales (CNSS)
- formalités de création d’entreprise
- conseil fiscal et optimisation
- audit/conformité
- gestion de trésorerie
- parfois facturation et gestion client
- accompagnement associations/ONG

Ils utilisent encore beaucoup Excel, des processus manuels et WhatsApp pour les validations.

## 2. Positionnement stratégique pour FlowBon

### Proposition de valeur
FlowBon doit être positionné comme :

- un outil de workflow des dépenses optimisé pour les cabinets comptables
- une plateforme de collaboration cabinet ↔ client
- un outil de comptabilité automatisée compatible OHADA
- un système de traçabilité et d’audit robuste

### Cible prioritaire
- cabinets comptables locaux
- PME togolaises gérées ou conseillées par ces cabinets
- ONG / associations avec besoin de reporting projet

## 3. MVP recommandé pour le marché togolais

### Fonctionnalités prioritaires
1. **Workflow dépenses sécurisé**
   - bon de dépense
   - validation manager
   - validation comptable
   - paiement caisse
   - rejet avec commentaire et retour au créateur

2. **Comptabilité automatisée**
   - mapping catégories → comptes comptables
   - génération d’écritures comptables
   - grand livre consultable
   - exports OTR-ready

3. **Trésorerie simple**
   - gestion caisse
   - trésorerie banque ultérieure
   - historique des paiements

4. **Multi-entreprises / multi-clients**
   - cabinet gestionnaire multi-sociétés
   - structure multi-tenant
   - séparation des données par client

5. **Reporting et conformité**
   - rapports financiers simples
   - export PDF/Excel
   - audit trail complet
   - historiques des validations

### Fonctionnalités différenciantes
- interface simple pour comptables et managers
- génération de références uniques de bons
- gouvernance anti-fraude forte
- support spécifique ONG / projets financés
- modèles de comptes préconfigurés SYSCOHADA

## 4. Solutions à rechercher maintenant

### A. Multi-tenant cabinet-client
- modèle de données `cabinet` + `client_company`
- permissions séparées par client
- dashboard cabinet pour suivre tous clients
- sous-domaines ou workspace client

### B. Processus de validation métier
- bornes de validation claires : `draft`, `pending`, `approved`, `rejected`, `paid`
- rejet avec commentaire obligatoire
- seul le créateur modifie après rejection
- règle anti-fraude : self-approval impossible

### C. OTR / fiscalité locale
- export des écritures comptables vers format OTR
- rapport TVA récapitulatif
- export grand livre et balance
- préparation des états financiers minimaux

### D. Onboarding et support client
- templates préconfigurés SYSCOHADA PME / ONG
- workflows de configuration pas à pas
- documentation simplifiée pour comptables
- import Excel/CSV depuis les outils existants

### E. Génération de numéro de référence unique
- champ `reference_number` obligatoire
- génération automatique par le système
- contrainte d’unicité globale pour éviter doublons
- option d’une structure de référence : `FLOW-YYYY-MM-0001`

## 5. Impact sur le plan V2 actuel

### Ajustements recommandés
- ajouter un axe "Cabinets comptables" dans la roadmap V2
- positionner Phase 0 comme MVP comptable de base
- intégrer les besoins OTR dans la Phase 3 (comptabilité)
- prévoir Phase 5 multi-entité comme multi-client cabinet
- ajouter un module "Onboarding Cabinet" après Phase 0

### Priorité des étapes
- renforcer l’étape 1/2 : validation du besoin cabinet
- faire de la Phase 0 un MVP utile aux cabinets
- conserver la gouvernance, mais avec focus cabinet/client

## 6. Prochaines actions sans coder

1. documenter les solutions métier prioritaires pour les cabinets
2. définir le MVP exact pour les premiers clients togolais
3. identifier les formats OTR et exigences fiscales locales
4. préparer les templates comptables SYSCOHADA ciblés Togo
5. concevoir l’organisation multi-tenant cabinet/client

## 7. Conclusion

FlowBon V2 doit être construit comme un outil utile pour les cabinets comptables togolais, avec :
- process de dépenses sécurisé
- comptabilité automatisée
- multi-client
- reporting OTR
- audit solide

Ce plan est un cadre de recherche, pas encore de développement. Il facilite la réflexion sur les futures solutions et permet de préparer un produit adapté au marché.
