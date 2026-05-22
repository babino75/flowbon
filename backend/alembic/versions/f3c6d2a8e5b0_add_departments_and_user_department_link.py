"""add_departments_and_user_department_link

Revision ID: f3c6d2a8e5b0
Revises: e2b5c1a7d4ed
Create Date: 2026-05-21 00:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3c6d2a8e5b0'
down_revision: Union[str, Sequence[str], None] = 'e2b5c1a7d4ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'departments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_departments_company_id'), 'departments', ['company_id'], unique=False)

    op.add_column('users', sa.Column('department_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_users_department_id', 'users', 'departments', ['department_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_users_department_id', 'users', type_='foreignkey')
    op.drop_column('users', 'department_id')
    op.drop_index(op.f('ix_departments_company_id'), table_name='departments')
    op.drop_table('departments')
