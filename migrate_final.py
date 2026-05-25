#!/usr/bin/env python3
"""
Treasury data migration - final version
"""
import sys
sys.path.insert(0, '/app')

from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.cash_register import CashRegister, CashTransaction
from app.models.treasury import TreasuryAccount, TreasuryTransaction
from app.models.company import Company
from app.models.user import User

database_url = settings.database_url
engine = create_engine(database_url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def migrate():
    print("🔄 Treasury Data Migration")
    print("="*60)
    
    try:
        # Step 1: Migrate cash registers
        cash_registers = db.query(CashRegister).all()
        print(f"\n📦 Migrating {len(cash_registers)} cash registers...")
        
        migration_map = {}
        for cr in cash_registers:
            creator = db.query(User).filter(User.company_id == cr.company_id).first()
            if not creator:
                continue
            
            ta = TreasuryAccount(
                id=uuid4(),
                company_id=cr.company_id,
                name=f"Legacy: {cr.name}",
                user_label=cr.name,
                type=cr.account_type or "CASH",
                currency=cr.currency or "XOF",
                opening_balance=0,
                current_balance=cr.current_balance or 0,
                is_active=cr.is_active,
                created_by=creator.id,
            )
            db.add(ta)
            db.flush()
            migration_map[str(cr.id)] = str(ta.id)
        
        db.commit()
        print(f"✅ Migrated {len(migration_map)} cash registers")
        
        # Step 2: Migrate cash transactions
        cash_tx = db.query(CashTransaction).all()
        print(f"\n💰 Migrating {len(cash_tx)} cash transactions...")
        
        migrated = 0
        for ct in cash_tx:
            ta_id = migration_map.get(str(ct.cash_register_id))
            if not ta_id:
                continue
            
            cr = db.query(CashRegister).filter(CashRegister.id == ct.cash_register_id).first()
            if not cr:
                continue
            
            creator_id = ct.created_by or db.query(User).filter(User.company_id == cr.company_id).first().id
            
            tx_map = {"IN": "IN", "OUT": "OUT", "ENTRY": "IN", "EXIT": "OUT"}
            
            tt = TreasuryTransaction(
                id=uuid4(),
                company_id=cr.company_id,
                treasury_account_id=UUID(ta_id),
                type=tx_map.get(ct.type, "OUT"),
                amount=ct.amount,
                currency=cr.currency or "XOF",
                source_type="LEGACY_CASH",
                source_id=ct.id,
                description=f"Migrated: {ct.description or ct.type}",
                status="VALIDATED",
                created_by=creator_id,
                validated_by=creator_id,
            )
            db.add(tt)
            migrated += 1
        
        db.commit()
        print(f"✅ Migrated {migrated} cash transactions")
        
        # Step 3: Create defaults for companies without accounts
        companies = db.query(Company).all()
        print(f"\n📦 Creating default accounts...")
        
        created = 0
        for co in companies:
            existing = db.query(TreasuryAccount).filter(TreasuryAccount.company_id == co.id).count()
            if existing > 0:
                continue
            
            admin = db.query(User).filter(
                User.company_id == co.id,
                User.role.in_(["admin", "super_admin"])
            ).first()
            
            if not admin:
                continue
            
            ta = TreasuryAccount(
                id=uuid4(),
                company_id=co.id,
                name="Caisse Principale",
                user_label="Main Cash Account",
                type="CASH",
                currency=co.currency or "XOF",
                is_active=True,
                created_by=admin.id,
            )
            db.add(ta)
            created += 1
        
        db.commit()
        print(f"✅ Created {created} default accounts")
        
        print("\n" + "="*60)
        print("✅ Migration complete!")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
