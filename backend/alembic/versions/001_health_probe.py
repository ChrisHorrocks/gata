"""health_probe table and seed row

Revision ID: 001
Revises:
Create Date: 2026-11-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "health_probe",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(sa.text("INSERT INTO health_probe (status) VALUES ('connected')"))


def downgrade() -> None:
    op.drop_table("health_probe")
