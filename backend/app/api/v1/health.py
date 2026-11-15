from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.health import HealthProbe
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    row = db.scalar(select(HealthProbe).order_by(HealthProbe.id).limit(1))
    if row is None:
        return HealthResponse(status="degraded", database="no_probe_row")
    return HealthResponse(status="ok", database=row.status)
