from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.constants import (
    LINK_KIND_MAGIC,
    MAGIC_LINK_RATE_LIMIT_PER_EMAIL,
    MAGIC_LINK_RATE_LIMIT_PER_IP,
    MAGIC_LINK_RATE_LIMIT_WINDOW,
)
from app.models.link_token import LinkToken
from app.time import clock


class RateLimitExceeded(Exception):
    pass


def _window_start() -> object:
    return clock.now() - MAGIC_LINK_RATE_LIMIT_WINDOW


def check_magic_link_rate_limits(db: Session, *, email: str, request_ip: str) -> None:
    window_start = _window_start()
    normalized = email.strip().lower()

    email_count = db.scalar(
        select(func.count())
        .select_from(LinkToken)
        .where(
            LinkToken.kind == LINK_KIND_MAGIC,
            LinkToken.email == normalized,
            LinkToken.created_at >= window_start,
        )
    )
    if email_count is not None and email_count >= MAGIC_LINK_RATE_LIMIT_PER_EMAIL:
        raise RateLimitExceeded()

    ip_count = db.scalar(
        select(func.count())
        .select_from(LinkToken)
        .where(
            LinkToken.kind == LINK_KIND_MAGIC,
            LinkToken.request_ip == request_ip,
            LinkToken.created_at >= window_start,
        )
    )
    if ip_count is not None and ip_count >= MAGIC_LINK_RATE_LIMIT_PER_IP:
        raise RateLimitExceeded()


def client_ip_from_request(headers: dict[str, str], default_host: str | None) -> str:
    forwarded = headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return default_host or "unknown"