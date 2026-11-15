from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class TripResponse(BaseModel):
    id: UUID
    name: str
    start_date: date
    emergency_notes: str | None
    version: int
    role: str


class TripListResponse(BaseModel):
    trips: list[TripResponse]


class TripCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    start_date: date


class TripPatchRequest(BaseModel):
    version: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    start_date: date | None = None
    emergency_notes: str | None = None


class TripDeleteRequest(BaseModel):
    version: int = Field(ge=1)


class VersionConflictDetail(BaseModel):
    message: str
    current: TripResponse