from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from app.auth.constants import MAGIC_LINK_RESPONSE_MESSAGE
from app.auth.csrf import csrf_cookie_kwargs, issue_csrf_token
from app.auth.magic import MagicTokenError, consume_magic_link, inspect_magic_link, issue_magic_link
from app.auth.rate_limits import (
    RateLimitExceeded,
    check_magic_link_rate_limits,
    client_ip_from_request,
)
from app.auth.sessions import create_session, format_session_cookie, session_cookie_kwargs
from app.config import settings
from app.deps import DbSession, Mail, SigningKeys
from app.schemas.auth import (
    MagicLinkConsumeRequest,
    MagicLinkInspectRequest,
    MagicLinkInspectResponse,
    MagicLinkRequest,
    MagicLinkRequestResponse,
    SessionResponse,
    UserResponse,
)

router = APIRouter()


@router.post("/magic-links", response_model=MagicLinkRequestResponse)
def request_magic_link(
    body: MagicLinkRequest,
    request: Request,
    db: DbSession,
    mail: Mail,
    keyset: SigningKeys,
) -> MagicLinkRequestResponse | JSONResponse:
    client_host = request.client.host if request.client is not None else None
    request_ip = client_ip_from_request(dict(request.headers), client_host)
    try:
        check_magic_link_rate_limits(db, email=str(body.email), request_ip=request_ip)
    except RateLimitExceeded:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content=MagicLinkRequestResponse(message=MAGIC_LINK_RESPONSE_MESSAGE).model_dump(),
        )

    compact = issue_magic_link(db, keyset, email=str(body.email), request_ip=request_ip)
    link = f"{settings.app_public_url.rstrip('/')}/sign-in/confirm?token={compact}"
    mail.send(
        to=str(body.email),
        subject="Sign in to gata",
        body=f"Open this link to sign in (expires in 15 minutes):\n\n{link}\n",
    )
    return MagicLinkRequestResponse(message=MAGIC_LINK_RESPONSE_MESSAGE)


@router.post("/magic-links/inspect", response_model=MagicLinkInspectResponse)
def inspect_magic_link_endpoint(
    body: MagicLinkInspectRequest,
    db: DbSession,
    keyset: SigningKeys,
) -> MagicLinkInspectResponse:
    try:
        email = inspect_magic_link(db, keyset, compact=body.token)
    except MagicTokenError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MagicLinkInspectResponse(email=email)


@router.post("/magic-links/consume", response_model=SessionResponse)
def consume_magic_link_endpoint(
    body: MagicLinkConsumeRequest,
    db: DbSession,
    keyset: SigningKeys,
    response: Response,
) -> SessionResponse:
    try:
        user = consume_magic_link(db, keyset, compact=body.token)
    except MagicTokenError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    session_row, verifier = create_session(db, user_id=user.id)
    cookie_value = format_session_cookie(session_row.id, verifier)
    cookie = session_cookie_kwargs(cookie_value)
    response.set_cookie(
        key=str(cookie["key"]),
        value=str(cookie["value"]),
        path=str(cookie["path"]),
        httponly=bool(cookie["httponly"]),
        secure=bool(cookie["secure"]),
        samesite="lax",
    )

    csrf_value = issue_csrf_token(session_row.id, verifier)
    csrf = csrf_cookie_kwargs(csrf_value)
    response.set_cookie(
        key=str(csrf["key"]),
        value=str(csrf["value"]),
        path=str(csrf["path"]),
        secure=bool(csrf["secure"]),
        samesite="lax",
        httponly=bool(csrf["httponly"]),
    )

    return SessionResponse(
        user=UserResponse(id=user.id, email=user.email, display_name=user.display_name)
    )