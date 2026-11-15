from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import CurrentUser, DbSession
from app.models.camp import Camp
from app.models.day import Day, DayKind
from app.schemas.camp import (
    CampCreateRequest,
    CampDeleteRequest,
    CampListResponse,
    CampPatchRequest,
    CampResponse,
)
from app.trips_access import get_trip_for_member
from app.versioning import assert_version_matches

router = APIRouter()


def _load_days(db: Session, trip_id: uuid.UUID) -> list[Day]:
    return list(
        db.scalars(select(Day).where(Day.trip_id == trip_id).order_by(Day.position)).all()
    )


def _walking_pin_numbers(days: list[Day]) -> dict[uuid.UUID, int]:
    pins: dict[uuid.UUID, int] = {}
    number = 0
    for day in days:
        if day.kind == DayKind.walking.value:
            number += 1
            pins[day.id] = number
    return pins


def _camp_response(camp: Camp, *, pin_number: int) -> CampResponse:
    return CampResponse(
        id=camp.id,
        day_id=camp.day_id,
        name=camp.name,
        latitude=camp.latitude,
        longitude=camp.longitude,
        notes=camp.notes,
        version=camp.version,
        pin_number=pin_number,
    )


def _list_response(db: Session, trip_id: uuid.UUID) -> CampListResponse:
    days = _load_days(db, trip_id)
    pin_numbers = _walking_pin_numbers(days)
    camps = list(db.scalars(select(Camp).where(Camp.trip_id == trip_id)).all())
    camps_by_day = {camp.day_id: camp for camp in camps}
    response_rows: list[CampResponse] = []
    for day in days:
        if day.kind != DayKind.walking.value:
            continue
        camp = camps_by_day.get(day.id)
        if camp is None:
            continue
        response_rows.append(_camp_response(camp, pin_number=pin_numbers[day.id]))
    return CampListResponse(camps=response_rows)


def _get_day_for_trip(db: Session, *, trip_id: uuid.UUID, day_id: uuid.UUID) -> Day:
    day = db.scalar(select(Day).where(Day.id == day_id, Day.trip_id == trip_id))
    if day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found")
    return day


def _get_camp_for_trip(db: Session, *, trip_id: uuid.UUID, camp_id: uuid.UUID) -> Camp:
    camp = db.scalar(select(Camp).where(Camp.id == camp_id, Camp.trip_id == trip_id))
    if camp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camp not found")
    return camp


def _default_camp_name(days: list[Day], day_id: uuid.UUID) -> str:
    walking_index = 0
    for day in days:
        if day.kind == DayKind.walking.value:
            walking_index += 1
            if day.id == day_id:
                return f"Camp {walking_index}"
    return "Camp"


@router.get("/trips/{trip_id}/camps", response_model=CampListResponse)
def list_camps(trip_id: uuid.UUID, db: DbSession, user: CurrentUser) -> CampListResponse:
    get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    return _list_response(db, trip_id)


@router.post(
    "/trips/{trip_id}/camps",
    response_model=CampResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_camp(
    trip_id: uuid.UUID,
    body: CampCreateRequest,
    db: DbSession,
    user: CurrentUser,
) -> CampResponse:
    get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    day = _get_day_for_trip(db, trip_id=trip_id, day_id=body.day_id)
    if day.kind != DayKind.walking.value:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Only walking days can have a camp",
        )
    existing = db.scalar(select(Camp).where(Camp.day_id == body.day_id))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="This day already has a camp",
        )

    days = _load_days(db, trip_id)
    name = body.name.strip()
    if not name:
        name = _default_camp_name(days, body.day_id)

    camp = Camp(
        trip_id=trip_id,
        day_id=body.day_id,
        name=name,
        latitude=body.latitude,
        longitude=body.longitude,
        notes=body.notes,
    )
    db.add(camp)
    db.commit()
    db.refresh(camp)
    pin = _walking_pin_numbers(days)[body.day_id]
    return _camp_response(camp, pin_number=pin)


@router.patch("/trips/{trip_id}/camps/{camp_id}", response_model=CampResponse)
def patch_camp(
    trip_id: uuid.UUID,
    camp_id: uuid.UUID,
    body: CampPatchRequest,
    db: DbSession,
    user: CurrentUser,
) -> CampResponse:
    get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    camp = _get_camp_for_trip(db, trip_id=trip_id, camp_id=camp_id)
    days = _load_days(db, trip_id)
    pin = _walking_pin_numbers(days)[camp.day_id]
    current = _camp_response(camp, pin_number=pin)
    assert_version_matches(expected=body.version, actual=camp.version, current=current)

    if body.model_fields_set - {"version"} == set():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No fields to update",
        )

    if "name" in body.model_fields_set and body.name is not None:
        camp.name = body.name.strip()
    if "latitude" in body.model_fields_set and body.latitude is not None:
        camp.latitude = body.latitude
    if "longitude" in body.model_fields_set and body.longitude is not None:
        camp.longitude = body.longitude
    if "notes" in body.model_fields_set:
        camp.notes = body.notes

    db.commit()
    db.refresh(camp)
    return _camp_response(camp, pin_number=pin)


@router.delete("/trips/{trip_id}/camps/{camp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camp(
    trip_id: uuid.UUID,
    camp_id: uuid.UUID,
    body: CampDeleteRequest,
    db: DbSession,
    user: CurrentUser,
) -> Response:
    get_trip_for_member(db, trip_id=trip_id, user_id=user.id)
    camp = _get_camp_for_trip(db, trip_id=trip_id, camp_id=camp_id)
    days = _load_days(db, trip_id)
    pin = _walking_pin_numbers(days)[camp.day_id]
    current = _camp_response(camp, pin_number=pin)
    assert_version_matches(expected=body.version, actual=camp.version, current=current)
    db.delete(camp)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)