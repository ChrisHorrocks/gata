from fastapi import APIRouter

from app.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas.me import EmergencyContact, MePatch, MeResponse

router = APIRouter()


def _me_response(user: User) -> MeResponse:
    contacts = [EmergencyContact.model_validate(raw) for raw in user.emergency_contacts]
    return MeResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        emergency_contacts=contacts,
    )


@router.get("/me", response_model=MeResponse)
def get_me(user: CurrentUser) -> MeResponse:
    return _me_response(user)


@router.patch("/me", response_model=MeResponse)
def patch_me(body: MePatch, user: CurrentUser, db: DbSession) -> MeResponse:
    if "display_name" in body.model_fields_set:
        user.display_name = body.display_name
    if "emergency_contacts" in body.model_fields_set:
        contacts = body.emergency_contacts or []
        user.emergency_contacts = [contact.model_dump() for contact in contacts]
    db.commit()
    db.refresh(user)
    return _me_response(user)