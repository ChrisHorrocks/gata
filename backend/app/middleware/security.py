from __future__ import annotations

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.auth.constants import CSRF_HEADER_NAME
from app.auth.cookie_policy import get_cookie_policy
from app.auth.csrf import header_matches_cookie, verify_csrf_token
from app.auth.fetch_metadata import fetch_metadata_rejects_request, is_state_changing_method
from app.auth.sessions import parse_session_cookie

_CSRF_EXEMPT_PATHS = frozenset(
    {
        "/api/v1/magic-links",
        "/api/v1/magic-links/inspect",
        "/api/v1/magic-links/consume",
    }
)


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if not is_state_changing_method(request.method):
            return await call_next(request)

        if fetch_metadata_rejects_request(request):
            return JSONResponse(status_code=403, content={"detail": "Forbidden"})

        if request.url.path in _CSRF_EXEMPT_PATHS:
            return await call_next(request)

        policy = get_cookie_policy()
        session_cookie = request.cookies.get(policy.session_name)
        parsed = parse_session_cookie(session_cookie)
        if parsed is not None:
            session_id, verifier = parsed
            header_token = request.headers.get(CSRF_HEADER_NAME)
            cookie_token = request.cookies.get(policy.csrf_name)
            if not header_matches_cookie(header_token, cookie_token):
                return JSONResponse(status_code=403, content={"detail": "CSRF check failed"})
            if not verify_csrf_token(session_id, verifier, header_token):
                return JSONResponse(status_code=403, content={"detail": "CSRF check failed"})

        return await call_next(request)