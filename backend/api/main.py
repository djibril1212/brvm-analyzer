"""
Application FastAPI BRVM Daily Analyzer.
Expose deux familles de routes :
  - /api/pipeline  : déclenchement du pipeline (protégé par PIPELINE_SECRET)
  - /api/market    : lecture des données de marché (public via rate limiting)
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .routes.market import router as market_router
from .routes.pipeline import router as pipeline_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="BRVM Daily Analyzer API",
    description="API d'accès aux données de marché BRVM et aux analyses IA quotidiennes.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
origins_raw = os.getenv("CORS_ORIGINS", "")
origins = [o.strip() for o in origins_raw.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(market_router, prefix="/api/market", tags=["Marché"])
app.include_router(pipeline_router, prefix="/api/pipeline", tags=["Pipeline"])


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Santé"])
async def health():
    return {"status": "ok", "service": "brvm-daily-analyzer"}


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "BRVM Daily Analyzer API — voir /docs"}
