"""add fiscal years and link to expenses

Revision ID: c4e8f2a91b3d
Revises: 523e309ad157
Create Date: 2026-05-18 13:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = 'c4e8f2a91b3d'
down_revision: Union[str, None] = '9f2425e8251e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Créer la table fiscal_years
    op.create_table(
        'fiscal_years',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id'), nullable=False, index=True),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='open'),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('closed_by_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # 2. Créer un exercice de rattrapage "Historique" pour chaque entreprise existante
    #    et rattacher toutes les dépenses existantes à cet exercice
    op.execute("""
        INSERT INTO fiscal_years (id, company_id, label, start_date, end_date, status, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            id,
            'Historique',
            '2020-01-01',
            '2024-12-31',
            'closed',
            NOW(),
            NOW()
        FROM companies
    """)

    # 3. Ajouter la colonne fiscal_year_id à expense_requests
    op.add_column('expense_requests', sa.Column('fiscal_year_id', UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_expense_fiscal_year', 'expense_requests', 'fiscal_years', ['fiscal_year_id'], ['id'])
    op.create_index('ix_expense_requests_fiscal_year_id', 'expense_requests', ['fiscal_year_id'])

    # 4. Rattacher les dépenses existantes à l'exercice historique de leur entreprise
    op.execute("""
        UPDATE expense_requests er
        SET fiscal_year_id = fy.id
        FROM fiscal_years fy
        WHERE fy.company_id = er.company_id
          AND fy.label = 'Historique'
          AND er.fiscal_year_id IS NULL
    """)

    # 5. Créer l'exercice courant (2025 ou l'année en cours) pour chaque entreprise
    op.execute("""
        INSERT INTO fiscal_years (id, company_id, label, start_date, end_date, status, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            id,
            TO_CHAR(NOW(), 'YYYY'),
            DATE_TRUNC('year', NOW()),
            (DATE_TRUNC('year', NOW()) + INTERVAL '1 year - 1 day'),
            'open',
            NOW(),
            NOW()
        FROM companies
    """)


def downgrade() -> None:
    op.drop_index('ix_expense_requests_fiscal_year_id', 'expense_requests')
    op.drop_constraint('fk_expense_fiscal_year', 'expense_requests', type_='foreignkey')
    op.drop_column('expense_requests', 'fiscal_year_id')
    op.drop_table('fiscal_years')
