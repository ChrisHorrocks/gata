from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.auth.constants import (
    SESSION_ABSOLUTE_TTL,
    SESSION_COOKIE_NAME,
    SESSION_SLIDING_TTL,
)
from app.models.session import Session as SessionRow
from app.models.user import User
from app.time import clock


def _hash_verifier(verifier: str) -> str:
    return hashlib.sha256(verifier.encode("utf-8")).hexdigest()


def parse_session_cookie(raw: str | None) -> tuple[uuid.UUID, str] | None:
    if not raw:
        return None
    if "." not in raw:
        return None
    session_id_str, verifier = raw.split(".", 1)
    if not verifier:
        return None
    try:
        return uuid.UUID(session_id_str), verifier
    except ValueError:
        return None


def format_session_cookie(session_id: uuid.UUID, verifier: str) -> str:
    return f"{session_id}.{verifier}"


def create_session(db: Session, *, user_id: uuid.UUID) -> tuple[SessionRow, str]:
    now = clock.now()
    verifier = secrets.token_urlsafe(32)
    row = SessionRow(
        verifier_hash=_hash_verifier(verifier),
        user_id=user_id,
        created_at=now,
        last_seen_at=now,
        expires_at=now + SESSION_ABSOLUTE_TTL,
        revoked_at=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row, verifier


def _session_is_valid(row: SessionRow, *, now: datetime) -> bool:
    if row.revoked_at is not None:
        return False
    if row.expires_at <= now:
        return False
    if row.last_seen_at + SESSION_SLIDING_TTL <= now:
        return False
    return True


def load_session(
    db: Session, *, cookie_value: str | None, touch: bool = True
) -> tuple[SessionRow, User] | None:
    parsed = parse_session_cookie(cookie_value)
    if parsed is None:
        return None
    session_id, verifier = parsed
    row = db.get(SessionRow, session_id)
    if row is None:
        return None
    if not hmac.compare_digest(row.verifier_hash, _hash_verifier(verifier)):
        return None

    now = clock.now()
    if not _session_is_valid(row, now=now):
        return None

    user = db.get(User, row.user_id)
    if user is None:
        return None

    if touch:
        row.last_seen_at = now
        db.commit()
        db.refresh(row)

    return row, user


def revoke_session(db: Session, *, session_id: uuid.UUID) -> None:
    row = db.get(SessionRow, session_id)
    if row is None:
        return
    if row.revoked_at is None:
        row.revoked_at = clock.now()
        db.commit()


def revoke_from_cookie(db: Session, *, cookie_value: str | None) -> None:
    parsed = parse_session_cookie(cookie_value)
    if parsed is None:
        return
    session_id, _ = parsed
    revoke_session(db, session_id=session_id)


def session_cookie_kwargs(value: str) -> dict[str, object]:
    return {
        "key": SESSION_COOKIE_NAME,
        "value": value,
        "path": "/",
        "httponly": True,
        "secure": True,
        "samesite": "lax",
    }


def clear_session_cookie_kwargs() -> dict[str, object]:
    return {
        "key": SESSION_COOKIE_NAME,
        "value": "",
        "path": "/",
        "httponly": True,
        "secure": True,
        "samesite": "lax",
        "max_age": 0,
    }


def advance_session_times_for_tests(
    db: Session, *, session_id: uuid.UUID, last_seen_delta: timedelta, absolute_delta: timedelta
) -> None:
    row = db.get(SessionRow, session_id)
    if row is None:
        return
    row.last_seen_at = row.last_seen_at - last_seen_delta
    row.expires_at = row.expires_at - absolute_delta
    db.commit()