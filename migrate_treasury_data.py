#!/usr/bin/env python3
"""
Data migration script: CashRegister → TreasuryAccount
Migrates legacy cash register data to new treasury system.
"""
import sys
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Add backend to path
sys.path.insert(0, '/home/sahm/flowbon/backend')

from app.config import settings
from app.database import Base
from app.models.cash_register import CashRegister, CashTransaction
from app.models.treasury import TreasuryAccount, TreasuryTransaction
from app.models.company import Company
from app.models.user import User

# Database setup
database_url = settings.database_url
engine = create_engine(database_url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def migrate_cash_register_to_treasury():
    """Migrate all cash registers to treasury accounts"""
    print("\n" + "="*60)
    print("Starting Cash Register → Treasury Migration")
    print("="*60)
    
    try:
        # Get all cash registers
        cash_registers = db.query(CashRegister).all()
        print(f"\nFound {len(cash_registers)} cash register(s)")
        
        migration_map = {}  # Maps CashRegister.id to TreasuryAccount.id
        
        for cr in cash_registers:
            print(f"\nMigrating CashRegister: {cr.name} (ID: {cr.id})")
            
            # Check if treasury account already exists for this cash register
            existing_account = db.query(TreasuryAccount).filter(
                TreasuryAccount.company_id == cr.company_id,
                TreasuryAccount.name == f"Legacy: {cr.name}"
            ).first()
            
            if existing_account:
                print(f"  ⚠ Treasury account already exists: {existing_account.id}")
                migration_map[str(cr.id)] = str(existing_account.id)
                continue
            
            # Get creator (admin or first user of company)
            creator = db.query(User).filter(
                User.company_id == cr.company_id
            ).first()
            
            if not creator:
                print(f"  ✗ No user found for company {cr.company_id}, skipping")
                continue
            
            # Create treasury account
            treasury_account = TreasuryAccount(
                id=uuid4(),
                company_id=cr.company_id,
                name=f"Legacy: {cr.name}",
                user_label=cr.name,
                type=cr.account_type or "CASH",  # Use account_type from CashRegister
                currency=cr.currency or "XOF",
                opening_balance=0,  # No opening balance in legacy CashRegister
                current_balance=cr.current_balance or 0,
                is_active=cr.is_active,
                created_by=creator.id,
                created_at=cr.created_at or datetime.utcnow(),
                updated_at=cr.updated_at or datetime.utcnow(),
            )
            
            db.add(treasury_account)
            db.flush()  # Flush to get the ID
            
            migration_map[str(cr.id)] = str(treasury_account.id)
            print(f"  ✓ Created treasury account: {treasury_account.id}")
        
        db.commit()
        print(f"\n✓ Successfully migrated {len(migration_map)} cash registers")
        return migration_map
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        return {}

def migrate_cash_transactions_to_treasury(migration_map):
    """Migrate cash transactions to treasury transactions"""
    print("\n" + "="*60)
    print("Starting Cash Transactions → Treasury Transactions Migration")
    print("="*60)
    
    try:
        cash_transactions = db.query(CashTransaction).all()
        print(f"\nFound {len(cash_transactions)} cash transaction(s)")
        
        migrated_count = 0
        
        for ct in cash_transactions:
            # Find corresponding treasury account
            treasury_account_id = migration_map.get(str(ct.cash_register_id))
            if not treasury_account_id:
                print(f"  ⚠ No treasury account mapping for CashRegister {ct.cash_register_id}")
                continue
            
            # Get company ID from cash_register
            cash_register = db.query(CashRegister).filter(
                CashRegister.id == ct.cash_register_id
            ).first()
            if not cash_register:
                continue
            
            company_id = cash_register.company_id
            
            # Map cash transaction type to treasury type
            tx_type_map = {
                "IN": "IN",
                "OUT": "OUT",
                "EXPENSE": "OUT",
                "ADVANCE": "OUT",
            }
            tx_type = tx_type_map.get(ct.type, "OUT")
            
            # Create treasury transaction
            treasury_tx = TreasuryTransaction(
                id=uuid4(),
                company_id=ct.company_id,
                treasury_account_id=UUID(treasury_account_id),
                type=tx_type,
                amount=ct.amount,
                currency=ct.currency or "XOF",
                source_type="LEGACY_CASH_TRANSACTION",
                source_id=ct.id,
                description=f"Migrated from CashTransaction: {ct.description or ct.type}",
                status="VALIDATED",  # Legacy transactions are already validated
                created_by=creator_id,
                validated_by=creator_id,
                created_at=ct.created_at or datetime.utcnow(),
                updated_at=ct.updated_at or datetime.utcnow(),
            )
            
            db.add(treasury_tx)
            migrated_count += 1
        
        db.commit()
        print(f"✓ Successfully migrated {migrated_count} cash transactions")
        return migrated_count
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error during transaction migration: {e}")
        import traceback
        traceback.print_exc()
        return 0

def create_default_treasury_accounts():
    """Create default treasury accounts for companies without any"""
    print("\n" + "="*60)
    print("Creating Default Treasury Accounts")
    print("="*60)
    
    try:
        companies = db.query(Company).all()
        created_count = 0
        
        for company in companies:
            # Check if company already has treasury accounts
            existing_accounts = db.query(TreasuryAccount).filter(
                TreasuryAccount.company_id == company.id
            ).count()
            
            if existing_accounts > 0:
                continue
            
            # Get first admin user
            admin_user = db.query(User).filter(
                User.company_id == company.id,
                User.role.in_(["admin", "super_admin"])
            ).first()
            
            if not admin_user:
                print(f"  ⚠ No admin user for {company.name}, skipping")
                continue
            
            # Create default cash account
            default_account = TreasuryAccount(
                id=uuid4(),
                company_id=company.id,
                name="Main Cash Account",
                user_label="Caisse principale",
                type="CASH",
                currency=company.currency or "XOF",
                opening_balance=0,
                current_balance=0,
                is_active=True,
                created_by=admin_user.id,
            )
            
            db.add(default_account)
            created_count += 1
            print(f"✓ Created default account for {company.name}")
        
        db.commit()
        print(f"\n✓ Created {created_count} default treasury account(s)")
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error creating default accounts: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("\n" + "#"*60)
    print("# Treasury Data Migration Script")
    print("#"*60)
    print(f"Database: {settings.database_url}")
    
    try:
        # Step 1: Migrate cash registers to treasury accounts
        migration_map = migrate_cash_register_to_treasury()
        
        # Step 2: Migrate cash transactions to treasury transactions
        if migration_map:
            tx_count = migrate_cash_transactions_to_treasury(migration_map)
        
        # Step 3: Create default accounts for companies without any
        create_default_treasury_accounts()
        
        print("\n" + "#"*60)
        print("# Migration Complete")
        print("#"*60)
        
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
