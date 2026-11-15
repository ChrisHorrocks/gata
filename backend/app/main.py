from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1 import gear, health, magic_links, me_routes, session_routes, trips
from app.middleware.security import SecurityMiddleware
from app.startup import validate_runtime_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    validate_runtime_settings()
    yield


app = FastAPI(title="gata", version="0.1.0", lifespan=lifespan)

app.add_middleware(SecurityMiddleware)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(magic_links.router, prefix="/api/v1", tags=["auth"])
app.include_router(session_routes.router, prefix="/api/v1", tags=["auth"])
app.include_router(me_routes.router, prefix="/api/v1", tags=["profile"])
app.include_router(trips.router, prefix="/api/v1", tags=["trips"])
app.include_router(gear.router, prefix="/api/v1", tags=["gear"])