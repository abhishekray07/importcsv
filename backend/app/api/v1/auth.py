from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.core.config import settings
from app.schemas.user import UserRead, UserCreate, UserUpdate
from app.schemas.auth import RefreshTokenRequest, PasswordResetRequest
from app.models.user import User as UserModel

from app.auth.users import (
    UserManager,
    fastapi_users,
    cookie_backend,
    get_user_manager,
    get_jwt_strategy,
    get_current_active_user as current_active_user,
)
from app.auth.token import (
    verify_refresh_token,
    revoke_token,
    revoke_all_user_tokens,
)
from app.auth.clerk import get_current_active_user as clerk_current_active_user

router = APIRouter()


# Custom login endpoint that returns both access and refresh tokens
@router.post("/login", response_model=Dict[str, Any])
async def login(
    credentials: OAuth2PasswordRequestForm = Depends(),
    user_manager: UserManager = Depends(get_user_manager),
    db: Session = Depends(get_db),
):
    """Login with username/password and get both access and refresh tokens"""
    try:
        # Use the standard FastAPI-Users authentication
        user = await user_manager.authenticate(credentials)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LOGIN_BAD_CREDENTIALS",
            )

        # Get the access token - using the JWT strategy directly
        strategy = get_jwt_strategy()
        access_token = await strategy.write_token(user)

        # Generate a refresh token
        from app.auth.token import create_refresh_token

        refresh_token = create_refresh_token(user.id)

        # Return both tokens
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token,
        }
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LOGIN_BAD_CREDENTIALS",
        )


@router.post("/jwt/login-with-refresh", response_model=Dict[str, Any])
async def login_with_refresh(
    credentials: OAuth2PasswordRequestForm = Depends(),
    user_manager: UserManager = Depends(get_user_manager),
    db: Session = Depends(get_db),
):
    """Login with username/password and get both access and refresh tokens"""
    try:
        # Use the standard FastAPI-Users authentication
        user = await user_manager.authenticate(credentials)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LOGIN_BAD_CREDENTIALS",
            )

        # Get the access token - using the JWT strategy directly
        strategy = get_jwt_strategy()
        access_token = await strategy.write_token(user)

        # Generate a refresh token
        from app.auth.token import create_refresh_token

        refresh_token = create_refresh_token(user.id)

        # Return both tokens
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token,
        }
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LOGIN_BAD_CREDENTIALS",
        )


# Cookie Authentication (for web applications)
router.include_router(
    fastapi_users.get_auth_router(cookie_backend),
    prefix="/cookie",
    tags=["auth"],
)

# User registration
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="",  # No prefix to match the frontend URL: /api/v1/auth/register
    tags=["auth"],
)

# Password reset
router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/reset-password",
    tags=["auth"],
)

# Email verification
router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/verify",
    tags=["auth"],
)

# User management
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)


@router.post("/refresh", response_model=Dict[str, str])
async def refresh_token_endpoint(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Refresh an access token using a refresh token
    Simplified version without blacklist checks
    """
    try:
        # Verify the refresh token - we don't need the db for the simplified version
        token_data = verify_refresh_token(request.refresh_token)

        # Extract the user ID from the token data
        if not token_data.user_id:
            # If user_id is not in the convenience field, get it from sub
            user_id = UUID(token_data.sub)
        else:
            user_id = token_data.user_id

        # Get the user directly from the database
        from app.models.user import User

        user = db.query(User).filter(User.id == user_id).first()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User is inactive or not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Generate a new token using the JWT strategy directly
        strategy = get_jwt_strategy()
        access_token = await strategy.write_token(user)

        # Also generate a new refresh token to extend the session
        from app.auth.token import create_refresh_token

        new_refresh_token = create_refresh_token(user_id)

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
        }
    except HTTPException as e:
        # Re-raise HTTP exceptions without modification
        print(f"HTTP Exception in refresh_token_endpoint: {e.detail}")
        raise
    except Exception as e:
        print(f"Refresh token error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout")
async def logout(
    request: Request,
    user: UserModel = Depends(current_active_user),
    db: Session = Depends(get_db),
):
    """
    Logout the current user by revoking their current token
    """
    # Get the token from the Authorization header
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(status_code=400, detail="Authorization header missing")

    try:
        # Extract the token
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=400, detail="Invalid authentication scheme")

        # Decode the token to get the JTI (token ID)
        try:
            # Decode with verification to extract the JTI
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )

            # Extract the JTI and revoke the token
            if "jti" in payload:
                token_id = payload["jti"]
                if revoke_token(token_id, db):
                    return {"detail": "Successfully logged out"}
                else:
                    raise HTTPException(status_code=500, detail="Error revoking token")
            else:
                raise HTTPException(
                    status_code=400, detail="Invalid token format (missing JTI)"
                )
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid token format: {str(e)}")


@router.post("/logout-all")
async def logout_all_devices(
    user: UserModel = Depends(current_active_user),
    db: Session = Depends(get_db),
):
    """
    Logout from all devices by revoking all tokens for the user
    """
    success = revoke_all_user_tokens(user.id, db)
    if success:
        return {"detail": "Successfully logged out from all devices"}
    else:
        raise HTTPException(
            status_code=500, detail="Error logging out from all devices"
        )


@router.post("/request-password-reset", response_model=Dict[str, str])
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset for a user
    This endpoint is already provided by FastAPI Users, but we're adding it here
    for clarity and to potentially customize it in the future.
    """
    # This will be handled by FastAPI Users
    # We're just redirecting to their endpoint
    return {
        "detail": "If your email is registered, you will receive a password reset link"
    }


@router.get("/me", response_model=Dict[str, Any])
async def get_user_me(
    user: UserModel = Depends(current_active_user),
):
    """
    Get the current user's information
    """
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "is_verified": user.is_verified,
        "clerk_user_id": user.clerk_user_id,
        "profile_image": user.profile_image,
    }


@router.get("/clerk/me", response_model=Dict[str, Any])
async def get_clerk_user_me(
    user: UserModel = Depends(clerk_current_active_user),
):
    """
    Get the current user's information using Clerk authentication
    """
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "is_verified": user.is_verified,
        "clerk_user_id": user.clerk_user_id,
        "profile_image": user.profile_image,
    }
