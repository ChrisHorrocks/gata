from fastapi import FastAPI

from app.api.v1 import health, magic_links, session_routes

app = FastAPI(title="gata", version="0.1.0")

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(magic_links.router, prefix="/api/v1", tags=["auth"])
app.include_router(session_routes.router, prefix="/api/v1", tags=["auth"])
