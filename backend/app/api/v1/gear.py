from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import CurrentUser, DbSession
from app.models.gear import GearLibraryItem
from app.schemas.gear import GearItemCreate, GearItemResponse, GearItemUpdate
from app.time import clock

router = APIRouter()


def _get_owned_item(db: Session, user_id: UUID, item_id: UUID) -> GearLibraryItem:
    row = db.scalar(
        select(GearLibraryItem).where(
            GearLibraryItem.id == item_id,
            GearLibraryItem.user_id == user_id,
        )
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gear item not found")
    return row


def _to_response(row: GearLibraryItem) -> GearItemResponse:
    return GearItemResponse(
        id=row.id,
        name=row.name,
        weight_grams=row.weight_grams,
        category=row.category,
        created_at=row.created_at,
    )


@router.get("/me/gear", response_model=list[GearItemResponse])
def list_gear(user: CurrentUser, db: DbSession) -> list[GearItemResponse]:
    rows = db.scalars(
        select(GearLibraryItem)
        .where(GearLibraryItem.user_id == user.id)
        .order_by(GearLibraryItem.name)
    ).all()
    return [_to_response(row) for row in rows]


@router.post("/me/gear", response_model=GearItemResponse, status_code=status.HTTP_201_CREATED)
def create_gear(body: GearItemCreate, user: CurrentUser, db: DbSession) -> GearItemResponse:
    row = GearLibraryItem(
        user_id=user.id,
        name=body.name,
        weight_grams=body.weight_grams,
        category=body.category,
        created_at=clock.now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_response(row)


@router.patch("/me/gear/{item_id}", response_model=GearItemResponse)
def update_gear(
    item_id: UUID,
    body: GearItemUpdate,
    user: CurrentUser,
    db: DbSession,
) -> GearItemResponse:
    if body.model_fields_set == set():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No fields to update",
        )

    row = _get_owned_item(db, user.id, item_id)
    if "name" in body.model_fields_set and body.name is not None:
        row.name = body.name
    if "weight_grams" in body.model_fields_set and body.weight_grams is not None:
        row.weight_grams = body.weight_grams
    if "category" in body.model_fields_set:
        row.category = body.category
    db.commit()
    db.refresh(row)
    return _to_response(row)


@router.delete("/me/gear/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gear(item_id: UUID, user: CurrentUser, db: DbSession) -> Response:
    row = _get_owned_item(db, user.id, item_id)
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)