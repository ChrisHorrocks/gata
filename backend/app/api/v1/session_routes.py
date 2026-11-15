from fastapi import APIRouter, Request, Response, status

from app.auth.constants import SESSION_COOKIE_NAME
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