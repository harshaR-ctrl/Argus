"""Argus — FastAPI application entry point."""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from argus import __version__
from argus.config import settings
from argus.database import init_db
from argus.api.routes import router

# ── Logging ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("argus")

# ── App ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="Argus",
    description="GitHub Repository Vulnerability Scanner",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


@app.on_event("startup")
async def startup():
    """Initialize database and ensure directories exist."""
    init_db()
    settings.reports_dir.mkdir(parents=True, exist_ok=True)
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"◈ Argus v{__version__} started on {settings.host}:{settings.port}")


@app.get("/")
async def root():
    return {
        "name": "Argus",
        "version": __version__,
        "description": "GitHub Repository Vulnerability Scanner",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "argus.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
