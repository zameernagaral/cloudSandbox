"""Auth-related Pydantic schemas with strict extra-field rejection."""

from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

EmailString = Annotated[
    str,
    Field(
        min_length=3,
        max_length=255,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    ),
]


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailString
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(None, max_length=128)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailString
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailString


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class UserOut(BaseModel):
    id: str
    email: str
    username: str | None
    display_name: str | None
    avatar_url: str | None
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)
