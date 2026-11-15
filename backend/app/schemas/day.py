from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class DayResponse(BaseModel):
    id: UUID
    position: int = Field(ge=0)
    kind: Literal["walking", "rest"]
    date: date
    distance_km: Decimal | None
    ascent_m: int | None
    descent_m: int | None
    version: int = Field(ge=1)


class DayListResponse(BaseModel):
    days: list[DayResponse]
    total_distance_km: Decimal
    total_ascent_m: int = Field(ge=0)


class DayCreateRequest(BaseModel):
    kind: Literal["walking", "rest"] = "walking"
    distance_km: Decimal | None = None
    ascent_m: int | None = None
    descent_m: int | None = None

    @field_validator("distance_km", "ascent_m", "descent_m")
    @classmethod
    def non_negative(cls, value: Decimal | int | None) -> Decimal | int | None:
        if value is not None and value < 0:
            raise ValueError("must be zero or more")
        return value

    @model_validator(mode="after")
    def rest_has_no_metrics(self) -> DayCreateRequest:
        if self.kind == "rest" and any(
            field is not None for field in (self.distance_km, self.ascent_m, self.descent_m)
        ):
            raise ValueError("rest days cannot include distance or elevation")
        return self


class DayPatchRequest(BaseModel):
    version: int = Field(ge=1)
    kind: Literal["walking", "rest"] | None = None
    distance_km: Decimal | None = None
    ascent_m: int | None = None
    descent_m: int | None = None

    @field_validator("distance_km", "ascent_m", "descent_m")
    @classmethod
    def non_negative(cls, value: Decimal | int | None) -> Decimal | int | None:
        if value is not None and value < 0:
            raise ValueError("must be zero or more")
        return value


class DayDeleteRequest(BaseModel):
    version: int = Field(ge=1)


class DayOrderEntry(BaseModel):
    id: UUID
    version: int = Field(ge=1)


class DayOrderRequest(BaseModel):
    order: list[DayOrderEntry] = Field(min_length=1)