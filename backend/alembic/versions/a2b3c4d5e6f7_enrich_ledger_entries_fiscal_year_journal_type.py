"""enrich_ledger_entries_fiscal_year_journal_type

Revision ID: a2b3c4d5e6f7
Revises: 9518b9f18cfc
Create Date: 2026-05-28 23:25:00.000000

Ajoute 3 colonnes à ledger_entries :
  - fiscal_year_id : lien vers l'exercice comptable actif au moment de l'écriture
  - journal_type   : classification du journal (CAISSE, BANQUE, ACHATS, VENTES, PAIE, OD)
  - piece_number   : numéro de pièce interne (référence du bon ou de l'avance)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = '9518b9f18cfc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Enrichit ledger_entries avec fiscal_year_id, journal_type et piece_number."""

    # 1. fiscal_year_id — FK optionnelle vers fiscal_years
    op.add_column(
        'ledger_entries',
        sa.Column('fiscal_year_id', sa.UUID(), nullable=True)
    )
    op.create_foreign_key(
        'fk_ledger_entries_fiscal_year_id',
        'ledger_entries', 'fiscal_years',
        ['fiscal_year_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index(
        'ix_ledger_entries_fiscal_year_id',
        'ledger_entries', ['fiscal_year_id'],
        unique=False
    )

    # 2. journal_type — ex: CAISSE, BANQUE, ACHATS, OD
    op.add_column(
        'ledger_entries',
        sa.Column('journal_type', sa.String(20), nullable=True)
    )
    op.create_index(
        'ix_ledger_entries_journal_type',
        'ledger_entries', ['journal_type'],
        unique=False
    )

    # 3. piece_number — numéro de pièce interne (BON-2026-xxx, ADV-2026-xxx…)
    op.add_column(
        'ledger_entries',
        sa.Column('piece_number', sa.String(100), nullable=True)
    )

    # 4. reference_number — ajouter un index s'il n'existe pas encore
    #    (la colonne existe depuis 2f78145c2329 mais sans index nommé)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_ledger_entries_reference_number "
        "ON ledger_entries (reference_number)"
    )


def downgrade() -> None:
    """Supprime les colonnes ajoutées."""
    try:
        op.drop_index('ix_ledger_entries_reference_number', table_name='ledger_entries')
    except Exception:
        pass

    op.drop_column('ledger_entries', 'piece_number')

    op.drop_index('ix_ledger_entries_journal_type', table_name='ledger_entries')
    op.drop_column('ledger_entries', 'journal_type')

    op.drop_index('ix_ledger_entries_fiscal_year_id', table_name='ledger_entries')
    op.drop_constraint('fk_ledger_entries_fiscal_year_id', 'ledger_entries', type_='foreignkey')
    op.drop_column('ledger_entries', 'fiscal_year_id')
