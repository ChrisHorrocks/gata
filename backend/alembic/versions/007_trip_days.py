"""trip days

Revision ID: 007
Revises: 006
Create Date: 2026-11-15

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "days",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("trip_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("distance_km", sa.Numeric(8, 2), nullable=True),
        sa.Column("ascent_m", sa.Integer(), nullable=True),
        sa.Column("descent_m", sa.Integer(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trip_id", "position", name="uq_days_trip_position"),
        sa.CheckConstraint(
            "kind IN ('walking', 'rest')",
            name="ck_days_kind",
        ),
        sa.CheckConstraint(
            "(kind = 'rest' AND distance_km IS NULL AND ascent_m IS NULL AND descent_m IS NULL) "
            "OR kind = 'walking'",
            name="ck_days_rest_no_metrics",
        ),
        sa.CheckConstraint(
            "(distance_km IS NULL OR distance_km >= 0) "
            "AND (ascent_m IS NULL OR ascent_m >= 0) "
            "AND (descent_m IS NULL OR descent_m >= 0)",
            name="ck_days_metrics_nonneg",
        ),
    )
    op.create_index("ix_days_trip_id", "days", ["trip_id"])


def downgrade() -> None:
    op.drop_index("ix_days_trip_id", table_name="days")
    op.drop_table("days")