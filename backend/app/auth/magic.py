from __future__ import annotations

import uuid
from datetime import timedelta

from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import KeySet
from joserfc.jwt import JWTClaimsRegistry
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth.constants import (
    LINK_KIND_MAGIC,
    MAGIC_TOKEN_AUD,
    MAGIC_TOKEN_TTL,
    MAGIC_TOKEN_TYP,
)
from app.auth.keys import active_signing_key
from app.config import settings
from app.models.link_token import LinkToken
from app.models.user import User
from app.time import clock


class MagicTokenError(Exception):
    pass


def _registry() -> JWTClaimsRegistry:
    return JWTClaimsRegistry(
        iss={"essential": True, "value": settings.jwt_issuer},
        aud={"essential": True, "value": MAGIC_TOKEN_AUD},
    )


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def issue_magic_link(db: Session, keyset: KeySet, *, email: str) -> str:
    normalized = _normalize_email(email)
    now = clock.now()
    jti = uuid.uuid4()
    expires = now + MAGIC_TOKEN_TTL

    db.execute(
        update(LinkToken)
        .where(
            LinkToken.email == normalized,
            LinkToken.kind == LINK_KIND_MAGIC,
            LinkToken.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )

    row = LinkToken(
        jti=jti,
        kind=LINK_KIND_MAGIC,
        email=normalized,
        expires_at=expires,
        consumed_at=None,
        created_at=now,
    )
    db.add(row)
    db.commit()

    signing_key = active_signing_key(keyset)
    header = {"alg": "ES256", "typ": MAGIC_TOKEN_TYP, "kid": signing_key.kid}
    claims = {
        "iss": settings.jwt_issuer,
        "aud": MAGIC_TOKEN_AUD,
        "sub": normalized,
        "jti": str(jti),
        "iat": now,
        "exp": expires,
    }
    return jwt.encode(header, claims, signing_key)


def _decode_magic_token(compact: str, keyset: KeySet) -> dict[str, object]:
    try:
        token = jwt.decode(compact, keyset, algorithms=["ES256"])
    except JoseError as exc:
        raise MagicTokenError("invalid token") from exc

    header = token.header
    if header.get("typ") != MAGIC_TOKEN_TYP:
        raise MagicTokenError("wrong token type")
    if header.get("alg") != "ES256":
        raise MagicTokenError("wrong algorithm")

    claims = token.claims
    reg = _registry()
    try:
        reg.validate(claims)
    except JoseError as exc:
        raise MagicTokenError("invalid claims") from exc

    return claims


def inspect_magic_link(db: Session, keyset: KeySet, *, compact: str) -> str:
    claims = _decode_magic_token(compact, keyset)
    email = str(claims["sub"])
    jti = uuid.UUID(str(claims["jti"]))
    row = db.get(LinkToken, jti)
    if row is None or row.kind != LINK_KIND_MAGIC:
        raise MagicTokenError("unknown token")
    if row.consumed_at is not None:
        raise MagicTokenError("already used")
    if row.expires_at <= clock.now():
        raise MagicTokenError("expired")
    if row.email != email:
        raise MagicTokenError("email mismatch")
    return email


def consume_magic_link(db: Session, keyset: KeySet, *, compact: str) -> User:
    claims = _decode_magic_token(compact, keyset)
    email = _normalize_email(str(claims["sub"]))
    jti = uuid.UUID(str(claims["jti"]))
    now = clock.now()

    row = db.get(LinkToken, jti)
    if (
        row is None
        or row.kind != LINK_KIND_MAGIC
        or row.consumed_at is not None
        or row.expires_at <= now
        or row.email != email
    ):
        raise MagicTokenError("token not consumable")
    row.consumed_at = now
    db.flush()

    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, display_name=None, created_at=now)
        db.add(user)
        db.flush()

    db.commit()
    db.refresh(user)
    return user


def advance_magic_link_expiry_for_tests(db: Session, *, jti: uuid.UUID, delta: timedelta) -> None:
    """Test helper: move link_tokens.expires_at into the past."""
    row = db.get(LinkToken, jti)
    if row is None:
        return
    row.expires_at = row.expires_at - delta
    db.commit()