"""add_expense_reference_and_rejection_comment

Revision ID: d9a7f2b3c1e4
Revises: a9de6e238858
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9a7f2b3c1e4'
down_revision: Union[str, Sequence[str], None] = 'a9de6e238858'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('expense_requests', sa.Column('reference_number', sa.String(), nullable=True))
    op.add_column('expense_requests', sa.Column('rejection_comment', sa.Text(), nullable=True))
    op.create_index(op.f('ix_expense_requests_reference_number'), 'expense_requests', ['reference_number'], unique=True)

    bind = op.get_bind()
    import uuid
    from datetime import datetime

    expenses = bind.execute(sa.text("SELECT id FROM expense_requests")).fetchall()
    for expense in expenses:
        reference_number = f"FB-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        bind.execute(
            sa.text(
                "UPDATE expense_requests SET reference_number = :reference_number WHERE id = :expense_id"
            ),
            {"reference_number": reference_number, "expense_id": expense[0]},
        )

    op.alter_column('expense_requests', 'reference_number', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_expense_requests_reference_number'), table_name='expense_requests')
    op.drop_column('expense_requests', 'reference_number')
    op.drop_column('expense_requests', 'rejection_comment')
