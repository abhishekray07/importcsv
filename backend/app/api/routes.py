from fastapi import APIRouter

from app.api.v1 import auth, importers, imports, clerk

api_router = APIRouter()

# Include all API routes
# Auth routes (FastAPI-Users authentication)
api_router.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])

# Clerk webhook routes
api_router.include_router(clerk.router, prefix="/v1/clerk", tags=["Clerk"])

# Other API routes
api_router.include_router(importers.router, prefix="/v1/importers", tags=["Importers"])
api_router.include_router(imports.router, prefix="/v1/imports", tags=["Imports"])

# Key-authenticated routes (no user authentication required)
api_router.include_router(imports.key_router, prefix="/v1/imports", tags=["Key Imports"])
