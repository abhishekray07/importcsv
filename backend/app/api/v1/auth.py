"""
Clerk-only authentication endpoints.
All custom authentication has been removed in favor of Clerk.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends
from app.models.user import User as UserModel
from app.auth.clerk import get_current_active_user as clerk_current_active_user

router = APIRouter()


@router.get("/me", response_model=Dict[str, Any])
async def get_user_me(
    user: UserModel = Depends(clerk_current_active_user),
):
    """
    Get the current user's information using Clerk authentication
    """
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "is_verified": user.is_verified,
        "clerk_user_id": user.clerk_user_id,
        "profile_image": user.profile_image,
    }