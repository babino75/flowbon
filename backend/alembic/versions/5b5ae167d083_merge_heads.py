"""merge heads

Revision ID: 5b5ae167d083
Revises: ac61304ccb73, f3c6d2a8e5b0
Create Date: 2026-05-21 15:13:15.890542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b5ae167d083'
down_revision: Union[str, Sequence[str], None] = ('ac61304ccb73', 'f3c6d2a8e5b0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
