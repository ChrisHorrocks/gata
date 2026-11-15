"""gear library items

Revision ID: 006
Revises: 005
Create Date: 2026-11-15

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "gear_library_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("weight_grams", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("weight_grams >= 0", name="ck_gear_library_items_weight_grams_nonneg"),
    )
    op.create_index("ix_gear_library_items_user_id", "gear_library_items", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_gear_library_items_user_id", table_name="gear_library_items")
    op.drop_table("gear_library_items")