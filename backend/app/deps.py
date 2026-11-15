from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from joserfc.jwk import KeySet
from sqlalchemy.orm import Session

from app.auth.constants import SESSION_COOKIE_NAME
from app.auth.keys import load_signing_keyset
from app.auth.sessions import load_session
from app.db import get_db
from app.mail import MailSender, get_mailer
from app.models.user import User

_signing_keyset: KeySet | None = None


def get_signing_keyset() -> KeySet:
    global _signing_keyset
    if _signing_keyset is None:
        _signing_keyset = load_signing_keyset()
    return _signing_keyset


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    session_cookie = request.cookies.get(SESSION_COOKIE_NAME)
    loaded = load_session(db, cookie_value=session_cookie, touch=True)
    if loaded is None:
        return None
    _, user = loaded
    return user


def require_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


DbSession = Annotated[Session, Depends(get_db)]
Mail = Annotated[MailSender, Depends(get_mailer)]
SigningKeys = Annotated[KeySet, Depends(get_signing_keyset)]
CurrentUser = Annotated[User, Depends(require_user)]