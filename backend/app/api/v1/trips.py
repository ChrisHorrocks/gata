from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import CurrentUser, DbSession
from app.models.membership import Membership, MembershipRole
from app.models.trip import Trip
from app.schemas.trip import (
    TripCreateRequest,
    TripDeleteRequest,
    TripListResponse,
    TripPatchRequest,
    TripResponse,
)
from app.trips_access import get_trip_for_member, require_organiser
from app.versioning import assert_version_matches

router = APIRouter()


def _trip_response(trip: Trip, role: str) -> TripResponse:
    return TripResponse(
        id=trip.id,
        name=trip.name,
        start_date=trip.start_date,
        emergency_notes=trip.emergency_notes,
        version=trip.version,
        role=role,
    )


def _list_trips(db: Session, user_id: uuid.UUID) -> list[TripResponse]:
    rows = db.execute(
        select(Trip, Membership.role)
        .join(Membership, Membership.trip_id == Trip.id)
        .where(Membership.user_id == user_id)
        .order_by(Trip.start_date.desc(), Trip.name)
    ).all()
    return [_trip_response(trip, role) for trip, role in rows]


@router.get("/trips", response_model=TripListResponse)
def list_trips(db: DbSession, user: CurrentUser) -> TripListResponse:
    return TripListResponse(trips=_list_trips(db, user.id))


@router.post("/trips", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(body: TripCreateRequest, db: DbSession, user: CurrentUser) -> TripResponse:
    now = datetime.now(UTC)
    trip = Trip(
        name=body.name.strip(),
        start_date=body.start_date,
        emergency_notes=None,
        created_at=now,
    )
    db.add(trip)
    db.flush()
    db.add(
        Membership(
            trip_id=trip.id,
            user_id=user.id,
            role=MembershipRole.organiser.value,
            joined_at=now,
        )
    )
    db.commit()
    db.refresh(trip)
    return _trip_response(trip, MembershipRole.organiser.value)


@router.get("/trips/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: uuid.UUID, db: DbSession, user: CurrentUser) -> TripResponse:
    trip, role = get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    return _trip_response(trip, role)


@router.patch("/trips/{trip_id}", response_model=TripResponse)
def patch_trip(
    trip_id: uuid.UUID,
    body: TripPatchRequest,
    db: DbSession,
    user: CurrentUser,
) -> TripResponse:
    trip, role = get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    current = _trip_response(trip, role)
    assert_version_matches(expected=body.version, actual=trip.version, current=current)

    if body.name is not None:
        trip.name = body.name.strip()
    if body.start_date is not None:
        trip.start_date = body.start_date
    if body.emergency_notes is not None:
        trip.emergency_notes = body.emergency_notes or None

    db.commit()
    db.refresh(trip)
    return _trip_response(trip, role)


@router.delete("/trips/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: uuid.UUID,
    body: TripDeleteRequest,
    db: DbSession,
    user: CurrentUser,
) -> Response:
    trip, role = get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    require_organiser(role)
    current = _trip_response(trip, role)
    assert_version_matches(expected=body.version, actual=trip.version, current=current)
    db.delete(trip)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)