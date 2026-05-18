#!/usr/bin/env python3
"""
Script CLI de promotion sécurisée — FlowBon Super Admin
Usage:
  python app/promote.py --email admin@example.com --role super_admin
  python app/promote.py --email user@example.com --role admin
  python app/promote.py --email user@example.com --role employee
"""

import argparse
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User

ALLOWED_ROLES = {"employee", "manager", "accountant", "admin", "super_admin"}


def promote(email: str, role: str):
    if role not in ALLOWED_ROLES:
        print(f"❌ Rôle invalide: '{role}'. Rôles autorisés: {', '.join(sorted(ALLOWED_ROLES))}")
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ Aucun utilisateur trouvé avec l'email: {email}")
            sys.exit(1)

        old_role = user.role
        user.role = role

        # If downgraded to employee, revoke all backup privileges
        if role == "employee":
            user.is_backup_manager = False
            user.is_backup_accountant = False
            print(f"  ℹ️  Suppléances révoquées automatiquement (rôle employé)")

        db.commit()
        db.refresh(user)

        print(f"")
        print(f"✅ Promotion réussie !")
        print(f"   Utilisateur : {user.name} ({user.email})")
        print(f"   Rôle        : {old_role}  →  {user.role}")
        if role == "super_admin":
            print(f"")
            print(f"🛡️  Ce compte a maintenant accès au portail de supervision global.")
            print(f"   Connectez-vous sur http://localhost:3000 puis accédez à :")
            print(f"   /dashboard/super-admin")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="FlowBon — Promotion de rôle d'utilisateur"
    )
    parser.add_argument("--email", required=True, help="Email de l'utilisateur cible")
    parser.add_argument(
        "--role",
        required=True,
        choices=sorted(ALLOWED_ROLES),
        help="Nouveau rôle à attribuer",
    )
    args = parser.parse_args()
    promote(args.email, args.role)
