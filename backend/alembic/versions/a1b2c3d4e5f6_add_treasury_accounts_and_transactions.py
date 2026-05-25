"""add treasury accounts and transactions tables (post-merge)

Revision ID: a1b2c3d4e5f6
Revises: 019aae6c9434, a9de6e238858, ac61304ccb73, f3c6d2a8e5b0
Create Date: 2026-05-23 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = ('019aae6c9434', 'a9de6e238858', 'ac61304ccb73', 'f3c6d2a8e5b0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create treasury_accounts table
    op.create_table('treasury_accounts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('user_label', sa.String(length=255), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),  # BANK, CASH, MOBILE_MONEY, SAFE, OTHER
    sa.Column('currency', sa.String(length=3), nullable=False),
    sa.Column('opening_balance', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
    sa.Column('current_balance', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
    sa.Column('accounting_account_id', sa.UUID(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('created_by', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['accounting_account_id'], ['accounting_accounts.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_treasury_accounts_id'), 'treasury_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_treasury_accounts_company_id'), 'treasury_accounts', ['company_id'], unique=False)
    op.create_index('ix_treasury_accounts_is_active', 'treasury_accounts', ['is_active'], unique=False)

    # Create treasury_transactions table
    op.create_table('treasury_transactions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('treasury_account_id', sa.UUID(), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),  # IN, OUT, TRANSFER, ADJUSTMENT
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('currency', sa.String(length=3), nullable=False),
    sa.Column('source_type', sa.String(length=100), nullable=False),  # EXPENSE_PAYMENT, ADVANCE_PAYMENT, DONATION, TRANSFER, REFUND, MANUAL_ADJUSTMENT
    sa.Column('source_id', sa.UUID(), nullable=True),
    sa.Column('category_id', sa.UUID(), nullable=True),
    sa.Column('linked_expense_id', sa.UUID(), nullable=True),
    sa.Column('linked_advance_id', sa.UUID(), nullable=True),
    sa.Column('project_id', sa.UUID(), nullable=True),
    sa.Column('department_id', sa.UUID(), nullable=True),
    sa.Column('from_treasury_account_id', sa.UUID(), nullable=True),
    sa.Column('to_treasury_account_id', sa.UUID(), nullable=True),
    sa.Column('reference', sa.String(length=100), nullable=True, unique=True),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),  # PENDING, VALIDATED, REJECTED
    sa.Column('created_by', sa.UUID(), nullable=False),
    sa.Column('validated_by', sa.UUID(), nullable=True),
    sa.Column('is_reconciled', sa.Boolean(), nullable=False, server_default='false'),
    sa.Column('external_reference', sa.String(length=100), nullable=True),
    sa.Column('accounting_entry_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['treasury_account_id'], ['treasury_accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['linked_expense_id'], ['expense_requests.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['linked_advance_id'], ['advance_requests.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['from_treasury_account_id'], ['treasury_accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['to_treasury_account_id'], ['treasury_accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['validated_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_treasury_transactions_id'), 'treasury_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_treasury_transactions_company_id'), 'treasury_transactions', ['company_id'], unique=False)
    op.create_index(op.f('ix_treasury_transactions_treasury_account_id'), 'treasury_transactions', ['treasury_account_id'], unique=False)
    op.create_index('ix_treasury_transactions_reference', 'treasury_transactions', ['reference'], unique=False)
    op.create_index('ix_treasury_transactions_status', 'treasury_transactions', ['status'], unique=False)
    op.create_index('ix_treasury_transactions_created_at', 'treasury_transactions', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_treasury_transactions_created_at', table_name='treasury_transactions')
    op.drop_index('ix_treasury_transactions_status', table_name='treasury_transactions')
    op.drop_index('ix_treasury_transactions_reference', table_name='treasury_transactions')
    op.drop_index(op.f('ix_treasury_transactions_treasury_account_id'), table_name='treasury_transactions')
    op.drop_index(op.f('ix_treasury_transactions_company_id'), table_name='treasury_transactions')
    op.drop_index(op.f('ix_treasury_transactions_id'), table_name='treasury_transactions')
    op.drop_table('treasury_transactions')
    
    op.drop_index('ix_treasury_accounts_is_active', table_name='treasury_accounts')
    op.drop_index(op.f('ix_treasury_accounts_company_id'), table_name='treasury_accounts')
    op.drop_index(op.f('ix_treasury_accounts_id'), table_name='treasury_accounts')
    op.drop_table('treasury_accounts')
