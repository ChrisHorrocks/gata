from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CampResponse(BaseModel):
    id: UUID
    day_id: UUID
    name: str
    latitude: float
    longitude: float
    notes: str | None
    version: int = Field(ge=1)
    pin_number: int = Field(ge=1)


class CampListResponse(BaseModel):
    camps: list[CampResponse]


class CampCreateRequest(BaseModel):
    day_id: UUID
    name: str = Field(min_length=1, max_length=120)
    latitude: float
    longitude: float
    notes: str | None = None

    @field_validator("latitude")
    @classmethod
    def latitude_range(cls, value: float) -> float:
        if value < -90 or value > 90:
            raise ValueError("latitude out of range")
        return value

    @field_validator("longitude")
    @classmethod
    def longitude_range(cls, value: float) -> float:
        if value < -180 or value > 180:
            raise ValueError("longitude out of range")
        return value


class CampPatchRequest(BaseModel):
    version: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = None

    @field_validator("latitude")
    @classmethod
    def latitude_range(cls, value: float | None) -> float | None:
        if value is not None and (value < -90 or value > 90):
            raise ValueError("latitude out of range")
        return value

    @field_validator("longitude")
    @classmethod
    def longitude_range(cls, value: float | None) -> float | None:
        if value is not None and (value < -180 or value > 180):
            raise ValueError("longitude out of range")
        return value


class CampDeleteRequest(BaseModel):
    version: int = Field(ge=1)