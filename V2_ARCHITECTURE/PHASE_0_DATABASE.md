# Phase 0 : Core Stable – Schéma de données détaillé

## Modèles SQLAlchemy à créer

### 1. ChartOfAccounts

```python
# backend/app/models/chart_of_accounts.py

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, String, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AccountType(str, Enum):
    ASSET = "asset"           # Actif
    LIABILITY = "liability"   # Passif
    EQUITY = "equity"         # Capitaux propres
    REVENUE = "revenue"       # Produits
    EXPENSE = "expense"       # Charges


class ChartOfAccounts(Base):
    __tablename__ = "chart_of_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    code = Column(String(20), nullable=False)  # Ex: 625100
    label = Column(String(255), nullable=False)  # Ex: Déplacements
    type = Column(String, nullable=False)  # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    is_active = Column(Boolean, default=True, nullable=False)
    archived = Column(Boolean, default=False, nullable=False)  # Soft delete
    description = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company")
    created_by_user = relationship("User")
    
    __table_args__ = (
        UniqueConstraint('company_id', 'code'),  # Code unique par entreprise
    )
```

### 2. AccountingMappings

```python
# backend/app/models/accounting_mapping.py

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, String, Boolean, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ContextType(str, Enum):
    NONE = "none"
    PROJECT = "project"
    DEPARTMENT = "department"
    COST_CENTER = "cost_center"


class AccountingMapping(Base):
    __tablename__ = "accounting_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    expense_category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id"), nullable=False)
    chart_account_id = Column(UUID(as_uuid=True), ForeignKey("chart_of_accounts.id"), nullable=False)
    context_type = Column(String, default=ContextType.NONE.value, nullable=False)
    context_value = Column(String, nullable=True)  # Ex: "project_123", "dept_finance"
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company")
    expense_category = relationship("ExpenseCategory")
    chart_account = relationship("ChartOfAccounts")
    created_by_user = relationship("User")
    
    __table_args__ = (
        UniqueConstraint('company_id', 'expense_category_id', 'context_type', 'context_value'),
    )
```

### 3. AccountingMappingHistory

```python
# backend/app/models/accounting_mapping_history.py

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class AccountingMappingHistory(Base):
    __tablename__ = "accounting_mapping_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    mapping_id = Column(UUID(as_uuid=True), ForeignKey("accounting_mappings.id"), nullable=False)
    old_value = Column(JSON, nullable=True)  # {chart_account_id, context_type, context_value}
    new_value = Column(JSON, nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reason = Column(Text, nullable=True)

    mapping = relationship("AccountingMapping")
    changed_by_user = relationship("User")
```

### 4. LedgerEntries

```python
# backend/app/models/ledger_entry.py

import uuid
from datetime import datetime, date
from enum import Enum

from sqlalchemy import Column, DateTime, Date, ForeignKey, String, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class JournalType(str, Enum):
    PURCHASE = "purchase"       # Journal d'achat
    CASH = "cash"               # Journal de caisse
    BANK = "bank"               # Journal de banque
    GENERAL = "general"         # Journal général


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    fiscal_year_id = Column(UUID(as_uuid=True), ForeignKey("fiscal_years.id"), nullable=False)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expense_requests.id"), nullable=True)  # Origine
    journal = Column(String, nullable=False)  # Type de journal
    debit_account_id = Column(UUID(as_uuid=True), ForeignKey("chart_of_accounts.id"), nullable=False)
    credit_account_id = Column(UUID(as_uuid=True), ForeignKey("chart_of_accounts.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text, nullable=True)
    reference_date = Column(Date, nullable=False)  # Date de l'opération
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company = relationship("Company")
    fiscal_year = relationship("FiscalYear")
    expense = relationship("ExpenseRequest")
    debit_account = relationship("ChartOfAccounts", foreign_keys=[debit_account_id])
    credit_account = relationship("ChartOfAccounts", foreign_keys=[credit_account_id])
    created_by_user = relationship("User")
```

### 5. AccountingTemplates

```python
# backend/app/models/accounting_template.py

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class AccountingTemplate(Base):
    __tablename__ = "accounting_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False, unique=True)  # Ex: "SYSCOHADA PME"
    description = Column(Text, nullable=True)
    accounts = Column(JSON, nullable=False)  # Liste des comptes à dupliquer
    mappings = Column(JSON, nullable=False)  # Liste des mappings à dupliquer
    is_default = Column(Boolean, default=False, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    created_by_user = relationship("User")
```

---

## Migrations Alembic à créer

### Migration : add_accounting_core

```python
# backend/alembic/versions/xxx_add_accounting_core.py

"""Add accounting core models: chart_of_accounts, mappings, ledger entries

Revision ID: xxx
Revises: yyy
Create Date: 2026-05-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'xxx'
down_revision = 'yyy'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create chart_of_accounts
    op.create_table(
        'chart_of_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(20), nullable=False),
        sa.Column('label', sa.String(255), nullable=False),
        sa.Column('type', sa.String, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('archived', sa.Boolean(), nullable=False, default=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'code', name='uq_chart_accounts_company_code'),
        sa.Index('ix_chart_accounts_company_id', 'company_id'),
    )

    # Create accounting_templates
    op.create_table(
        'accounting_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('accounts', postgresql.JSON(), nullable=False),
        sa.Column('mappings', postgresql.JSON(), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_accounting_templates_name'),
        sa.Index('ix_accounting_templates_is_default', 'is_default'),
    )

    # Create accounting_mappings
    op.create_table(
        'accounting_mappings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('expense_category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chart_account_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('context_type', sa.String, nullable=False, default='none'),
        sa.Column('context_value', sa.String, nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.ForeignKeyConstraint(['expense_category_id'], ['expense_categories.id']),
        sa.ForeignKeyConstraint(['chart_account_id'], ['chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'expense_category_id', 'context_type', 'context_value',
                           name='uq_accounting_mappings_unique'),
        sa.Index('ix_accounting_mappings_company_id', 'company_id'),
    )

    # Create accounting_mapping_history
    op.create_table(
        'accounting_mapping_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mapping_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('old_value', postgresql.JSON(), nullable=True),
        sa.Column('new_value', postgresql.JSON(), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('changed_at', sa.DateTime(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['mapping_id'], ['accounting_mappings.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_accounting_mapping_history_mapping_id', 'mapping_id'),
    )

    # Create ledger_entries
    op.create_table(
        'ledger_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fiscal_year_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('expense_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('journal', sa.String, nullable=False),
        sa.Column('debit_account_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('credit_account_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reference_date', sa.Date(), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.ForeignKeyConstraint(['fiscal_year_id'], ['fiscal_years.id']),
        sa.ForeignKeyConstraint(['expense_id'], ['expense_requests.id']),
        sa.ForeignKeyConstraint(['debit_account_id'], ['chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['credit_account_id'], ['chart_of_accounts.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_ledger_entries_company_id', 'company_id'),
        sa.Index('ix_ledger_entries_fiscal_year_id', 'fiscal_year_id'),
        sa.Index('ix_ledger_entries_expense_id', 'expense_id'),
    )


def downgrade() -> None:
    op.drop_table('ledger_entries')
    op.drop_table('accounting_mapping_history')
    op.drop_table('accounting_mappings')
    op.drop_table('accounting_templates')
    op.drop_table('chart_of_accounts')
```

---

## Données de seed : Templates comptables

### SYSCOHADA PME

```json
{
  "name": "SYSCOHADA PME",
  "description": "Système Comptable OHADA pour PME (Plan de comptes simplifié)",
  "accounts": [
    {
      "code": "101",
      "label": "Capital",
      "type": "equity"
    },
    {
      "code": "108",
      "label": "Résultats mis en réserve",
      "type": "equity"
    },
    {
      "code": "121",
      "label": "Résultats de l'exercice",
      "type": "equity"
    },
    {
      "code": "2",
      "label": "Classe 2 : Actif immobilisé",
      "type": "asset"
    },
    {
      "code": "3",
      "label": "Classe 3 : Stocks",
      "type": "asset"
    },
    {
      "code": "401",
      "label": "Fournisseurs et comptes rattachés",
      "type": "liability"
    },
    {
      "code": "404",
      "label": "Clients",
      "type": "asset"
    },
    {
      "code": "505",
      "label": "Placements courants",
      "type": "asset"
    },
    {
      "code": "601",
      "label": "Achats de marchandises",
      "type": "expense"
    },
    {
      "code": "605",
      "label": "Fournitures de fonctionnement",
      "type": "expense"
    },
    {
      "code": "612",
      "label": "Transports",
      "type": "expense"
    },
    {
      "code": "625",
      "label": "Déplacements",
      "type": "expense"
    },
    {
      "code": "628",
      "label": "Frais de télécommunications",
      "type": "expense"
    },
    {
      "code": "631",
      "label": "Services bancaires",
      "type": "expense"
    },
    {
      "code": "653",
      "label": "Charges sociales",
      "type": "expense"
    },
    {
      "code": "701",
      "label": "Ventes de marchandises",
      "type": "revenue"
    },
    {
      "code": "706",
      "label": "Prestations de services",
      "type": "revenue"
    },
    {
      "code": "531",
      "label": "Caisse",
      "type": "asset"
    },
    {
      "code": "5212",
      "label": "Banque",
      "type": "asset"
    }
  ],
  "mappings": [
    {
      "expense_category": "Transport",
      "chart_account": "625"
    },
    {
      "expense_category": "Internet",
      "chart_account": "628"
    },
    {
      "expense_category": "Mission",
      "chart_account": "625"
    },
    {
      "expense_category": "Fournitures",
      "chart_account": "605"
    }
  ]
}
```

---

## Fichier de seed pour insertion

À exécuter après les migrations pour peupler les templates.

