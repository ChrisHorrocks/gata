import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MembershipRole(enum.StrEnum):
    organiser = "organiser"
    member = "member"


class Membership(Base):
    __tablename__ = "memberships"

    trip_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(16))
    joined_at: Mapped[datetime] = mapped_column()