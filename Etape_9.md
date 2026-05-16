# ETAPE 9 - TESTS, SECURITE ET QUALITE

Objectif : garantir que FlowBon est fiable et securise avant de prendre de vrais clients.

Cette etape est indispensable pour un SaaS qui gere des donnees financieres. Un bug dans le calcul des montants ou une faille dans l'isolation des donnees peut detruire la confiance des clients.

---

# 1. Pourquoi tester ?

Sans tests :

- tu ne sais pas si un changement casse une fonctionnalite existante
- tu ne sais pas si l'isolation multi-tenant fonctionne vraiment
- tu ne sais pas si le workflow de validation respecte les regles
- un client peut voir les donnees d'un autre client sans que tu le saches
- un employe peut approuver son propre bon sans que tu le saches

Avec tests :

- chaque modification est verifiee automatiquement
- les bugs critiques sont detectes avant qu'un client les trouve
- tu peux deployer avec confiance

---

# 2. Types de tests

## Tests unitaires

Testent une fonction isolee.

```python
# tests/test_auth.py

def test_hash_password():
    """Le mot de passe doit etre hashe, jamais stocke en clair."""
    hashed = hash_password("mon_mot_de_passe")
    assert hashed != "mon_mot_de_passe"
    assert verify_password("mon_mot_de_passe", hashed) is True
    assert verify_password("mauvais_mdp", hashed) is False

def test_password_minimum_length():
    """Le mot de passe doit faire au moins 8 caracteres."""
    with pytest.raises(ValueError):
        RegisterSchema(name="Test", email="test@test.com", password="123")

def test_email_validation():
    """L'email doit etre valide."""
    with pytest.raises(ValueError):
        RegisterSchema(name="Test", email="pas_un_email", password="12345678")
```

## Tests d'integration

Testent une route API complete.

```python
# tests/test_expenses.py

def test_create_expense(client, auth_token):
    """Un employe peut creer un bon de depense."""
    response = client.post("/expenses", json={
        "amount": 15000,
        "currency": "XOF",
        "category": "transport",
        "description": "Taxi client"
    }, headers={"Authorization": f"Bearer {auth_token}"})
    
    assert response.status_code == 201
    assert response.json()["status"] == "draft"

def test_cannot_create_negative_expense(client, auth_token):
    """Un montant negatif doit etre refuse."""
    response = client.post("/expenses", json={
        "amount": -5000,
        "currency": "XOF",
        "category": "transport",
        "description": "Test negatif"
    }, headers={"Authorization": f"Bearer {auth_token}"})
    
    assert response.status_code == 422
```

---

# 3. Tests critiques a ecrire en priorite

## Test 1 : Isolation multi-tenant

C'est LE test le plus important. Si ce test echoue, FlowBon ne doit PAS etre deploye.

```python
# tests/test_tenant_isolation.py

def test_company_a_cannot_see_company_b_expenses(client):
    """Une entreprise ne doit JAMAIS voir les bons d'une autre entreprise."""
    
    # Creer un bon avec l'entreprise A
    token_a = login_as("employe_a@entreprise_a.com")
    client.post("/expenses", json={
        "amount": 10000, "category": "transport", "description": "Bon A"
    }, headers={"Authorization": f"Bearer {token_a}"})
    
    # Se connecter avec l'entreprise B
    token_b = login_as("employe_b@entreprise_b.com")
    response = client.get("/expenses", headers={"Authorization": f"Bearer {token_b}"})
    
    # L'entreprise B ne doit voir AUCUN bon de l'entreprise A
    expenses = response.json()
    for expense in expenses:
        assert expense["company_id"] != company_a_id

def test_company_a_cannot_access_company_b_expense_by_id(client):
    """Une entreprise ne peut pas acceder au bon d'une autre par son ID."""
    
    # Creer un bon avec l'entreprise A
    token_a = login_as("employe_a@entreprise_a.com")
    res = client.post("/expenses", json={
        "amount": 10000, "category": "transport", "description": "Bon A"
    }, headers={"Authorization": f"Bearer {token_a}"})
    expense_id = res.json()["id"]
    
    # Tenter d'y acceder avec l'entreprise B
    token_b = login_as("employe_b@entreprise_b.com")
    response = client.get(f"/expenses/{expense_id}", headers={"Authorization": f"Bearer {token_b}"})
    
    assert response.status_code == 404  # pas 403, pour ne pas confirmer l'existence
```

## Test 2 : Workflow de validation

```python
# tests/test_workflow.py

def test_employee_cannot_approve_own_expense(client):
    """Un employe ne peut pas approuver son propre bon."""
    token = login_as("employe@demo.com")  # role: employee
    expense_id = create_expense(token)
    
    response = client.post(f"/expenses/{expense_id}/approve", 
        headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 403

def test_manager_cannot_approve_own_expense(client):
    """Un manager ne peut pas approuver son propre bon."""
    token = login_as("manager@demo.com")  # role: manager
    expense_id = create_expense(token)
    
    response = client.post(f"/expenses/{expense_id}/approve",
        headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 403

def test_reject_requires_comment(client):
    """Un refus sans commentaire doit etre refuse."""
    token = login_as("manager@demo.com")
    expense_id = create_pending_expense()
    
    response = client.post(f"/expenses/{expense_id}/reject",
        json={"comment": ""},
        headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 422

def test_valid_status_transitions(client):
    """Seules les transitions de statut autorisees doivent fonctionner."""
    token_manager = login_as("manager@demo.com")
    
    # Un bon 'paid' ne peut pas revenir a 'pending'
    paid_expense_id = create_paid_expense()
    response = client.post(f"/expenses/{paid_expense_id}/approve",
        headers={"Authorization": f"Bearer {token_manager}"})
    
    assert response.status_code == 400

def test_full_workflow(client):
    """Test du workflow complet : draft -> pending -> approved -> paid."""
    
    # 1. Employe cree un brouillon
    token_emp = login_as("employe@demo.com")
    expense = create_expense(token_emp)  # status: draft
    
    # 2. Employe soumet
    client.post(f"/expenses/{expense['id']}/submit", 
        headers={"Authorization": f"Bearer {token_emp}"})
    
    # 3. Manager approuve
    token_mgr = login_as("manager@demo.com")
    client.post(f"/expenses/{expense['id']}/approve",
        headers={"Authorization": f"Bearer {token_mgr}"})
    
    # 4. Comptable paye
    token_acc = login_as("comptable@demo.com")
    client.post(f"/expenses/{expense['id']}/mark-as-paid",
        headers={"Authorization": f"Bearer {token_acc}"})
    
    # 5. Verifier le statut final
    response = client.get(f"/expenses/{expense['id']}",
        headers={"Authorization": f"Bearer {token_emp}"})
    assert response.json()["status"] == "paid"
    
    # 6. Verifier l'historique
    logs = client.get(f"/expenses/{expense['id']}/logs",
        headers={"Authorization": f"Bearer {token_emp}"})
    assert len(logs.json()) == 4  # created, submitted, approved, paid
```

## Test 3 : Permissions par role

```python
# tests/test_permissions.py

def test_employee_cannot_access_admin_routes(client):
    """Un employe ne peut pas acceder aux routes admin."""
    token = login_as("employe@demo.com")
    
    # Ne peut pas voir la liste de tous les utilisateurs
    assert client.get("/users", headers={"Authorization": f"Bearer {token}"}).status_code == 403
    
    # Ne peut pas modifier un role
    assert client.patch("/users/123/role", json={"role": "admin"},
        headers={"Authorization": f"Bearer {token}"}).status_code == 403

def test_employee_cannot_see_other_employees_expenses(client):
    """Un employe ne peut voir que SES propres bons."""
    token_a = login_as("employe_a@demo.com")
    token_b = login_as("employe_b@demo.com")
    
    # Employe A cree un bon
    expense = create_expense(token_a)
    
    # Employe B ne doit pas le voir
    response = client.get(f"/expenses/{expense['id']}",
        headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 404
```

## Test 4 : Authentification

```python
# tests/test_auth.py

def test_expired_token_rejected(client):
    """Un token expire doit etre refuse."""
    expired_token = create_expired_token("user@demo.com")
    response = client.get("/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401

def test_invalid_token_rejected(client):
    """Un token invalide doit etre refuse."""
    response = client.get("/auth/me",
        headers={"Authorization": "Bearer faux_token_123"})
    assert response.status_code == 401

def test_deactivated_user_cannot_login(client):
    """Un utilisateur desactive ne peut pas se connecter."""
    deactivate_user("user@demo.com")
    response = client.post("/auth/login", json={
        "email": "user@demo.com", "password": "password123"
    })
    assert response.status_code == 403
```

---

# 4. Comment lancer les tests

## Setup

```bash
cd backend
pip install pytest pytest-asyncio httpx
```

## Structure des tests

```text
backend/
 - tests/
   - __init__.py
   - conftest.py          (fixtures : client, tokens, base de test)
   - test_auth.py
   - test_expenses.py
   - test_workflow.py
   - test_permissions.py
   - test_tenant_isolation.py
```

## Configuration (conftest.py)

```python
# tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Base de donnees de test PostgreSQL.
# Important : pour les tests critiques, utiliser le meme moteur que la production.
TEST_DATABASE_URL = "postgresql://flowbon_test:flowbon_test@localhost:5432/flowbon_test"
engine = create_engine(TEST_DATABASE_URL)
TestSession = sessionmaker(bind=engine)

@pytest.fixture(autouse=True)
def setup_db():
    """Recreer la base avant chaque test."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    """Client de test FastAPI."""
    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)
```

## Lancer les tests

```bash
# Lancer tous les tests
pytest

# Lancer avec details
pytest -v

# Lancer un fichier specifique
pytest tests/test_tenant_isolation.py

# Lancer avec couverture de code
pip install pytest-cov
pytest --cov=app --cov-report=html
```

---

# 5. Audit de securite final

Avant de prendre le premier vrai client, verifier :

```text
AUTHENTIFICATION
 OK - mots de passe hashes avec bcrypt
 OK - tokens JWT avec expiration (30 min access, 7 jours refresh)
 OK - rate limiting sur /auth/login (5/minute)
 OK - rate limiting sur /auth/register (3/minute)
 OK - validation email et mot de passe fort (8+ caracteres)
 OK - token invalide/expire = 401

AUTORISATION
 OK - chaque role a ses permissions specifiques
 OK - un employe ne peut pas acceder aux routes admin
 OK - un employe ne voit que ses propres bons
 OK - personne ne peut approuver son propre bon

ISOLATION MULTI-TENANT
 OK - toutes les requetes filtrent par company_id
 OK - une entreprise ne peut pas voir les donnees d'une autre
 OK - un acces par ID a un bon d'une autre entreprise retourne 404

DONNEES
 OK - HTTPS actif partout
 OK - headers de securite configures
 OK - fichiers .env non commites
 OK - backups de la base actifs
 OK - uploads limites en taille (10 MB) et en format (PDF, JPG, PNG)
 OK - Swagger desactive en production

MONITORING
 OK - Sentry capture les erreurs
 OK - logs structures en production
```

---

# 6. Checkpoint

A la fin de cette etape :

```text
OK - tests d'isolation multi-tenant ecrits et valides
OK - tests du workflow de validation ecrits et valides
OK - tests des permissions par role ecrits et valides
OK - tests d'authentification ecrits et valides
OK - audit de securite final valide
OK - couverture de code > 70% sur les fonctionnalites critiques
OK - CI/CD lance les tests automatiquement a chaque push
OK - FlowBon est pret a etre deploye pour des demos et clients pilotes
```

---

# Ensuite, on passe a :

# ETAPE 10 - DEPLOIEMENT ET PREMIERS CLIENTS
