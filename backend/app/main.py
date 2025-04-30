from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import os
import logging
from typing import Callable
from dotenv import load_dotenv

from app.api.routes import api_router
from app.core.config import settings


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        return response


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),  # Log to console
    ],
)

# Disable all SQLAlchemy logging at the root level
logging.getLogger("sqlalchemy").setLevel(logging.CRITICAL)
logging.getLogger("sqlalchemy.engine").setLevel(logging.CRITICAL)


# Create a filter to block SQLAlchemy log messages
class SQLAlchemyFilter(logging.Filter):
    def filter(self, record):
        return not record.name.startswith("sqlalchemy")


# Apply the filter to the root logger
root_logger = logging.getLogger()
root_logger.addFilter(SQLAlchemyFilter())

# Also set a higher level for the root logger to avoid INFO logs
logging.getLogger().setLevel(logging.WARNING)

# We've disabled SQL logging by setting echo=False in the engine configuration
# in app/db/base.py, which is the proper way to disable SQLAlchemy logging

# Load environment variables
load_dotenv()

app = FastAPI(
    title="ImportCSV API",
    description="API for ImportCSV - An intelligent CSV import tool",
    version="0.1.0",
)

# Configure CORS
logging.info(f"Configuring CORS with origins: {settings.CORS_ORIGINS}")

# Add CORS middleware - settings are environment-specific through the settings classes
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    expose_headers=settings.CORS_EXPOSE_HEADERS,
    max_age=settings.CORS_MAX_AGE,
)

# Add security headers
app.add_middleware(SecurityHeadersMiddleware)

# Add GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add session middleware for cookie-based auth
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    https_only=settings.ENVIRONMENT == "production",
)

# In production, add TrustedHostMiddleware
if settings.ENVIRONMENT == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# All FastAPI Users routes are now included via api_router
# This avoids duplication and makes route management cleaner

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "ImportCSV API is running"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
