from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class HealthProbe(Base):
    """Single-row table used by the walking-skeleton health check."""

    __tablename__ = "health_probe"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
