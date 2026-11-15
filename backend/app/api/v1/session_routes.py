from fastapi import APIRouter, Request, Response, status

from app.auth.constants import SESSION_COOKIE_NAME
from app.auth.csrf import clear_csrf_cookie_kwargs
from app.auth.sessions import revoke_from_cookie
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
    revoke_from_cookie(db, cookie_value=request.cookies.get(SESSION_COOKIE_NAME))
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=True,
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