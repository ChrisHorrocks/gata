from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkRequestResponse(BaseModel):
    message: str


class MagicLinkInspectRequest(BaseModel):
    token: str = Field(min_length=1)


class MagicLinkInspectResponse(BaseModel):
    email: EmailStr


class MagicLinkConsumeRequest(BaseModel):
    token: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str | None


class SessionResponse(BaseModel):
    user: UserResponse