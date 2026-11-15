"""Trip membership lookups. Return 404 when absent so trips cannot be probed."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.membership import Membership, MembershipRole
from app.models.trip import Trip


def get_trip_for_member(db: Session, *, trip_id: uuid.UUID, user_id: uuid.UUID) -> tuple[Trip, str]:
    row = db.execute(
        select(Trip, Membership.role)
        .join(Membership, Membership.trip_id == Trip.id)
        .where(Membership.trip_id == trip_id, Membership.user_id == user_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    trip, role = row
    return trip, role


def require_organiser(role: str) -> None:
    if role != MembershipRole.organiser.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organiser only")