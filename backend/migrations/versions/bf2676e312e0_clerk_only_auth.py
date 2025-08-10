"""clerk_only_auth

Revision ID: bf2676e312e0
Revises: ae7dba5b61d8
Create Date: 2025-08-09 17:25:58.502849

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf2676e312e0'
down_revision: Union[str, None] = 'ae7dba5b61d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
