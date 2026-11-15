from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import CurrentUser, DbSession
from app.models.camp import Camp
from app.models.day import Day, DayKind
from app.models.trip import Trip
from app.schemas.day import (
    DayCreateRequest,
    DayDeleteRequest,
    DayListResponse,
    DayOrderRequest,
    DayPatchRequest,
    DayResponse,
)
from app.trips_access import get_trip_for_member
from app.versioning import assert_version_matches

router = APIRouter()


def _day_date(trip: Trip, position: int) -> date:
    return trip.start_date + timedelta(days=position)


def _day_kind(day: Day) -> DayKind:
    return DayKind(day.kind)


def _day_response(day: Day, trip: Trip) -> DayResponse:
    kind = _day_kind(day)
    distance_km, ascent_m, descent_m = None, None, None
    if kind == DayKind.walking:
        distance_km, ascent_m, descent_m = day.distance_km, day.ascent_m, day.descent_m
    return DayResponse(
        id=day.id,
        position=day.position,
        kind=kind.value,
        date=_day_date(trip, day.position),
        distance_km=distance_km,
        ascent_m=ascent_m,
        descent_m=descent_m,
        version=day.version,
    )


def _load_days(db: Session, trip_id: uuid.UUID) -> list[Day]:
    return list(
        db.scalars(select(Day).where(Day.trip_id == trip_id).order_by(Day.position)).all()
    )


def _totals(days: list[Day]) -> tuple[Decimal, int]:
    total_distance = Decimal("0")
    total_ascent = 0
    for day in days:
        if _day_kind(day) != DayKind.walking:
            continue
        total_distance += day.distance_km or Decimal("0")
        total_ascent += day.ascent_m or 0
    return total_distance, total_ascent


def _list_response(trip: Trip, days: list[Day]) -> DayListResponse:
    total_distance_km, total_ascent_m = _totals(days)
    return DayListResponse(
        days=[_day_response(day, trip) for day in days],
        total_distance_km=total_distance_km,
        total_ascent_m=total_ascent_m,
    )


def _reject_rest_metrics(
    *,
    kind: DayKind,
    distance_km: Decimal | None,
    ascent_m: int | None,
    descent_m: int | None,
) -> None:
    if kind == DayKind.rest and any(
        value is not None for value in (distance_km, ascent_m, descent_m)
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rest days cannot include distance or elevation",
        )


def _apply_walking_defaults(day: Day) -> None:
    if day.kind == DayKind.walking:
        if day.distance_km is None:
            day.distance_km = Decimal("0")
        if day.ascent_m is None:
            day.ascent_m = 0


def _get_day_for_trip(db: Session, *, trip_id: uuid.UUID, day_id: uuid.UUID) -> Day:
    day = db.scalar(select(Day).where(Day.id == day_id, Day.trip_id == trip_id))
    if day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found")
    return day


def _compact_positions(db: Session, trip_id: uuid.UUID) -> None:
    days = _load_days(db, trip_id)
    for index, day in enumerate(days):
        if day.position != index:
            day.position = index


@router.get("/trips/{trip_id}/days", response_model=DayListResponse)
def list_days(trip_id: uuid.UUID, db: DbSession, user: CurrentUser) -> DayListResponse:
    trip, _role = get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    days = _load_days(db, trip_id)
    return _list_response(trip, days)


@router.post(
    "/trips/{trip_id}/days",
    response_model=DayResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_day(
    trip_id: uuid.UUID,
    body: DayCreateRequest,
    db: DbSession,
    user: CurrentUser,
) -> DayResponse:
    trip, _role = get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    kind = DayKind(body.kind)
    _reject_rest_metrics(
        kind=kind,
        distance_km=body.distance_km,
        ascent_m=body.ascent_m,
        descent_m=body.descent_m,
    )

    next_position = db.scalar(
        select(func.coalesce(func.max(Day.position), -1)).where(Day.trip_id == trip_id)
    )
    position = (next_position if next_position is not None else -1) + 1

    day = Day(
        trip_id=trip_id,
        position=position,
        kind=kind.value,
        distance_km=body.distance_km,
        ascent_m=body.ascent_m,
        descent_m=body.descent_m,
    )
    if kind == DayKind.rest:
        day.distance_km = None
        day.ascent_m = None
        day.descent_m = None
    else:
        _apply_walking_defaults(day)

    db.add(day)
    db.commit()
    db.refresh(day)
    return _day_response(day, trip)


@router.patch("/trips/{trip_id}/days/{day_id}", response_model=DayResponse)
def patch_day(
    trip_id: uuid.UUID,
    day_id: uuid.UUID,
    body: DayPatchRequest,
    db: DbSession,
    user: CurrentUser,
) -> DayResponse:
    trip, _role = get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    day = _get_day_for_trip(db, trip_id=trip_id, day_id=day_id)
    current = _day_response(day, trip)
    assert_version_matches(expected=body.version, actual=day.version, current=current)

    next_kind = DayKind(body.kind) if body.kind is not None else _day_kind(day)
    if body.model_fields_set - {"version"} == set():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )

    metric_fields = {"distance_km", "ascent_m", "descent_m"}
    if next_kind == DayKind.rest:
        if metric_fields & body.model_fields_set:
            _reject_rest_metrics(
                kind=next_kind,
                distance_km=body.distance_km if "distance_km" in body.model_fields_set else None,
                ascent_m=body.ascent_m if "ascent_m" in body.model_fields_set else None,
                descent_m=body.descent_m if "descent_m" in body.model_fields_set else None,
            )
        day.kind = DayKind.rest.value
        day.distance_km = None
        day.ascent_m = None
        day.descent_m = None
        camp = db.scalar(select(Camp).where(Camp.day_id == day.id))
        if camp is not None:
            db.delete(camp)
    else:
        day.kind = DayKind.walking.value
        if "distance_km" in body.model_fields_set:
            day.distance_km = body.distance_km
        if "ascent_m" in body.model_fields_set:
            day.ascent_m = body.ascent_m
        if "descent_m" in body.model_fields_set:
            day.descent_m = body.descent_m
        _apply_walking_defaults(day)

    db.commit()
    db.refresh(day)
    return _day_response(day, trip)


@router.delete("/trips/{trip_id}/days/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_day(
    trip_id: uuid.UUID,
    day_id: uuid.UUID,
    body: DayDeleteRequest,
    db: DbSession,
    user: CurrentUser,
) -> Response:
    trip, _role = get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    day = _get_day_for_trip(db, trip_id=trip_id, day_id=day_id)
    current = _day_response(day, trip)
    assert_version_matches(expected=body.version, actual=day.version, current=current)
    db.delete(day)
    db.flush()
    _compact_positions(db, trip_id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/trips/{trip_id}/days/order", response_model=DayListResponse)
def reorder_days(
    trip_id: uuid.UUID,
    body: DayOrderRequest,
    db: DbSession,
    user: CurrentUser,
) -> DayListResponse:
    trip, _role = get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    existing = _load_days(db, trip_id)
    if len(body.order) != len(existing):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Order must include every day once",
        )

    by_id = {day.id: day for day in existing}
    if {entry.id for entry in body.order} != set(by_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Order must include every day once",
        )

    list_response = _list_response(trip, existing)
    for entry in body.order:
        day = by_id[entry.id]
        if entry.version != day.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Version conflict",
                    "current": list_response.model_dump(mode="json"),
                },
            )

    temporary_base = len(existing) + 1000
    for index, entry in enumerate(body.order):
        by_id[entry.id].position = temporary_base + index
    db.flush()
    for index, entry in enumerate(body.order):
        by_id[entry.id].position = index

    db.commit()
    days = _load_days(db, trip_id)
    return _list_response(trip, days)