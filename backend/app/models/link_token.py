import uuid
from datetime import datetime

from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class LinkToken(Base):
    __tablename__ = "link_tokens"

    jti: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True)
    kind: Mapped[str] = mapped_column(String(32))
    email: Mapped[str] = mapped_column(String(320), index=True)
    expires_at: Mapped[datetime] = mapped_column()
    consumed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column()