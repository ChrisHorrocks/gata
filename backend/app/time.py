"""Controllable clock for tests (token/session expiry in later tickets)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class Clock:
    """Returns a fixed instant when frozen; otherwise wall clock."""

    _frozen: datetime | None = field(default=None, repr=False)

    def now(self) -> datetime:
        if self._frozen is not None:
            return self._frozen
        return datetime.now(UTC)

    def freeze(self, instant: datetime) -> None:
        self._frozen = instant

    def unfreeze(self) -> None:
        self._frozen = None


clock = Clock()
