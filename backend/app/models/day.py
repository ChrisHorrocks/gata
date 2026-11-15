import enum
import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DayKind(enum.StrEnum):
    walking = "walking"
    rest = "rest"


class Day(Base):
    __tablename__ = "days"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(), primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(Uuid(), ForeignKey("trips.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    distance_km: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    ascent_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    descent_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    __mapper_args__ = {"version_id_col": version}