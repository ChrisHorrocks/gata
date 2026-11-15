"""Per-row version checks (ADR 2). Reuse from any versioned write endpoint."""

from __future__ import annotations

from fastapi import HTTPException, status
from pydantic import BaseModel


def assert_version_matches(*, expected: int, actual: int, current: BaseModel) -> None:
    if expected != actual:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Version conflict",
                "current": current.model_dump(mode="json"),
            },
        )