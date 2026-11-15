from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class GearItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    weight_grams: int = Field(ge=0)
    category: str | None = Field(default=None, max_length=100)

    @field_validator("category", mode="before")
    @classmethod
    def empty_category_is_none(cls, value: object) -> object:
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("name must not be blank")
        return trimmed


class GearItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    weight_grams: int | None = Field(default=None, ge=0)
    category: str | None = None

    @field_validator("category", mode="before")
    @classmethod
    def empty_category_is_none(cls, value: object) -> object:
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("name must not be blank")
        return trimmed


class GearItemResponse(BaseModel):
    id: UUID
    name: str
    weight_grams: int
    category: str | None
    created_at: datetime