"""link_tokens: request_ip for rate limits

Revision ID: 003
Revises: 002
Create Date: 2026-11-15

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("link_tokens", sa.Column("request_ip", sa.String(length=45), nullable=True))
    op.create_index(
        "ix_link_tokens_request_ip_kind_created",
        "link_tokens",
        ["request_ip", "kind", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_link_tokens_request_ip_kind_created", table_name="link_tokens")
    op.drop_column("link_tokens", "request_ip")