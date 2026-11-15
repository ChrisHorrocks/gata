from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class EmergencyContact(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    relationship: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=1, max_length=50)


class MeResponse(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str | None
    emergency_contacts: list[EmergencyContact]


class MePatch(BaseModel):
    display_name: str | None = None
    emergency_contacts: list[EmergencyContact] | None = None

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("emergency_contacts")
    @classmethod
    def at_most_two_contacts(
        cls, value: list[EmergencyContact] | None
    ) -> list[EmergencyContact] | None:
        if value is not None and len(value) > 2:
            raise ValueError("At most two emergency contacts")
        return value