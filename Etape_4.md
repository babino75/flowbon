# ETAPE 4 - BONS DE DEPENSES

Objectif : construire le coeur de FlowBon.

Le bon de depense est la fonctionnalite principale que les entreprises vont payer.

---

# 1. Objectif produit

Un employe doit pouvoir demander un remboursement ou declarer une depense sans papier ni Excel.

Il doit renseigner :

- montant
- devise
- categorie (transport, achat, mission, fournitures, etc.)
- description
- date de depense
- justificatif si disponible (photo ou PDF)

---

# 2. Statuts du bon

```text
draft      → brouillon sauvegarde, pas encore soumis
pending    → soumis, en attente de validation
approved   → valide par le manager
rejected   → refuse par le manager
paid       → paye par le comptable
cancelled  → annule par l'employe
```

Le statut `draft` permet a l'employe de sauvegarder un brouillon avant de soumettre. Utile quand il n'a pas encore la facture.

Le statut `cancelled` permet a l'employe d'annuler un bon `draft` ou `pending` si c'etait une erreur.

---

# 3. Backend

## Tables principales

```text
expense_requests
 - id (UUID)
 - company_id (FK -> companies)
 - user_id (FK -> users)
 - amount (decimal, precision 2)
 - currency (defaut: devise de l'entreprise)
 - category (enum ou string)
 - description (text)
 - status (draft, pending, approved, rejected, paid, cancelled)
 - expense_date (date de la depense reelle)
 - submitted_at (date de soumission, nullable si draft)
 - created_at
 - updated_at

attachments
 - id (UUID)
 - company_id (FK -> companies)
 - expense_request_id (FK -> expense_requests)
 - file_url
 - file_name
 - file_size (en octets)
 - file_type (mime type)
 - created_at
```

## Categories par defaut

```text
transport
achat_fournitures
mission_deplacement
restauration
hebergement
communication
maintenance
autre
```

L'admin peut personnaliser les categories de son entreprise plus tard.

## Gestion de la devise

Chaque entreprise a une devise par defaut configuree dans la table `companies` :

```text
companies
 - default_currency (XOF, XAF, USD, EUR, etc.)
```

Quand un employe cree un bon, la devise est pre-remplie avec celle de son entreprise. Il peut la changer si necessaire (ex: depense a l'etranger).

## Upload de justificatifs

Regles de securite pour l'upload :

```text
Formats acceptes : PDF, JPG, JPEG, PNG
Taille maximale : 10 MB par fichier
Nombre maximum : 5 fichiers par bon
Stockage : dossier local en MVP, S3 ou equivalent en production
```

Validation cote backend :

```python
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

async def validate_upload(file):
    extension = file.filename.split(".")[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Format non accepte. Utilisez PDF, JPG ou PNG.")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Type de fichier non accepte.")

    size = 0
    while chunk := await file.read(1024 * 1024):
        size += len(chunk)
        if size > MAX_FILE_SIZE:
            raise HTTPException(400, "Fichier trop volumineux. Maximum 10 MB.")

    await file.seek(0)
    return size
```

Note : ne pas se baser seulement sur `file.size`. Avec FastAPI, il vaut mieux mesurer la taille reelle du fichier en lisant le contenu par morceaux, puis revenir au debut avec `seek(0)` avant le stockage.

Verification post-upload :

```python
if saved_file_size > MAX_FILE_SIZE:
    raise HTTPException(400, "Fichier trop volumineux. Maximum 10 MB.")
```

## Routes API

```text
POST   /expenses                  → creer un bon (draft ou pending)
GET    /expenses                  → liste de mes bons (avec filtres)
GET    /expenses/{id}             → detail d'un bon
PATCH  /expenses/{id}             → modifier un bon (seulement si draft ou pending)
DELETE /expenses/{id}             → supprimer un bon (seulement si draft)
POST   /expenses/{id}/submit      → soumettre un brouillon (draft -> pending)
POST   /expenses/{id}/cancel      → annuler un bon (draft ou pending -> cancelled)
POST   /expenses/{id}/attachments → uploader un justificatif
DELETE /expenses/{id}/attachments/{attachment_id} → supprimer un justificatif
```

## Filtres sur la liste des bons

```text
GET /expenses?status=pending           → filtrer par statut
GET /expenses?category=transport       → filtrer par categorie
GET /expenses?from=2025-01-01&to=2025-12-31  → filtrer par periode
GET /expenses?page=1&limit=20         → pagination
```

---

# 4. Frontend

## Pages minimum

```text
/dashboard/expenses            → liste de mes bons (avec filtres et recherche)
/dashboard/expenses/new        → creer un nouveau bon
/dashboard/expenses/[id]       → detail d'un bon
/dashboard/expenses/[id]/edit  → modifier un bon (si draft ou pending)
```

## Actions minimum

- creer un bon (formulaire avec validation)
- sauvegarder en brouillon (draft)
- soumettre un brouillon (draft -> pending)
- voir la liste de ses bons avec filtres (statut, categorie, periode)
- voir le detail d'un bon avec son historique
- modifier un bon tant qu'il n'est pas approuve
- annuler un bon en attente
- ajouter une facture ou une photo (drag & drop)
- voir l'apercu des justificatifs uploades
- supprimer un justificatif

## UX important

- afficher les montants formates selon la devise (ex: 50 000 XOF)
- badge de couleur pour chaque statut (vert=approuve, rouge=refuse, orange=en attente)
- confirmation avant annulation ou suppression
- message de succes apres chaque action

---

# 5. Checkpoint

A la fin de cette etape :

```text
OK - un employe peut creer un bon avec tous les champs necessaires
OK - un employe peut sauvegarder en brouillon et soumettre plus tard
OK - un employe peut annuler un bon en attente
OK - le bon est rattache a son entreprise (isolation par company_id)
OK - le bon apparait dans son dashboard avec filtres
OK - les justificatifs peuvent etre uploades (PDF, JPG, PNG, max 10MB)
OK - les montants sont affiches avec la bonne devise
OK - les statuts sont clairs et visuels
```

Quand c'est termine, on passe a :

# ETAPE 5 - WORKFLOW DE VALIDATION
