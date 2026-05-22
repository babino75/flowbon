"""add_accounting_accounts_and_category_mappings

Revision ID: e2b5c1a7d4ed
Revises: d9a7f2b3c1e4
Create Date: 2026-05-21 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2b5c1a7d4ed'
down_revision: Union[str, Sequence[str], None] = 'd9a7f2b3c1e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'accounting_accounts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'code', name='uq_accounting_account_company_code')
    )
    op.create_index(op.f('ix_accounting_accounts_id'), 'accounting_accounts', ['id'], unique=False)

    op.create_table(
        'expense_category_account_mappings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('expense_category_id', sa.UUID(), nullable=False),
        sa.Column('accounting_account_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['expense_category_id'], ['expense_categories.id'], ),
        sa.ForeignKeyConstraint(['accounting_account_id'], ['accounting_accounts.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'expense_category_id', name='uq_category_account_mapping')
    )
    op.create_index(op.f('ix_expense_category_account_mappings_id'), 'expense_category_account_mappings', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_expense_category_account_mappings_id'), table_name='expense_category_account_mappings')
    op.drop_table('expense_category_account_mappings')
    op.drop_index(op.f('ix_accounting_accounts_id'), table_name='accounting_accounts')
    op.drop_table('accounting_accounts')
