from fastapi import APIRouter, Request, Response, status

from app.auth.cookie_policy import get_cookie_policy
from app.auth.csrf import clear_csrf_cookie_kwargs
from app.auth.sessions import clear_session_cookie_kwargs, revoke_from_cookie
from app.deps import CurrentUser, DbSession
from app.schemas.auth import SessionResponse, UserResponse

router = APIRouter()


@router.get("/session", response_model=SessionResponse)
def get_session(user: CurrentUser) -> SessionResponse:
    return SessionResponse(
        user=UserResponse(id=user.id, email=user.email, display_name=user.display_name)
    )


@router.post("/session/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_session(request: Request, db: DbSession, response: Response) -> None:
    policy = get_cookie_policy()
    revoke_from_cookie(db, cookie_value=request.cookies.get(policy.session_name))
    session_clear = clear_session_cookie_kwargs()
    response.delete_cookie(
        key=str(session_clear["key"]),
        path=str(session_clear["path"]),
        httponly=bool(session_clear["httponly"]),
        secure=bool(session_clear["secure"]),
        samesite="lax",
    )
    csrf_clear = clear_csrf_cookie_kwargs()
    response.delete_cookie(
        key=str(csrf_clear["key"]),
        path=str(csrf_clear["path"]),
        secure=bool(csrf_clear["secure"]),
        httponly=bool(csrf_clear["httponly"]),
        samesite="lax",
    )