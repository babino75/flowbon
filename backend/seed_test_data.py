#!/usr/bin/env python3
"""
Seed test data for FlowBon
"""
import os
import sys
sys.path.insert(0, '/app')

from app.database import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.core.security import hash_password
from uuid import uuid4

db = SessionLocal()

# Create test company
company_id = uuid4()
company = Company(
    id=company_id,
    name="FlowBon SuperSystem",
    email="flowbon@test.com",
    phone="+223 75 00 00 00",
    city="Bamako",
    country="Mali",
    currency="XOF",
    subscription_plan="professional",
)
db.add(company)
db.commit()

print(f"✓ Created company: {company.name} ({company.id})")

# Test users
users_data = [
    {
        "email": "sbawa@ngs-africa.com",
        "password": "password1234",
        "name": "Admin User",
        "role": "admin",
    },
    {
        "email": "babi@test.com",
        "password": "password123",
        "name": "Employer Test",
        "role": "employee",
    },
    {
        "email": "manager@test.com",
        "password": "password123",
        "name": "Manager Test",
        "role": "manager",
    },
    {
        "email": "comp@test.com",
        "password": "password123",
        "name": "Comptable Test",
        "role": "accountant",
    },
    {
        "email": "titi@test.com",
        "password": "password1234",
        "name": "Caisse Test",
        "role": "cashier",
    },
]

for user_data in users_data:
    user = User(
        id=uuid4(),
        email=user_data["email"],
        password_hash=hash_password(user_data["password"]),
        name=user_data["name"],
        is_active=True,
        company_id=company.id,
        role=user_data["role"],
    )
    db.add(user)
    print(f"✓ Created user: {user.email} ({user.role})")

db.commit()

print("\n✅ Test data seeded successfully!")
db.close()
