"""
Clerk authentication utilities for FastAPI.
"""
import logging
from typing import Dict, Optional, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import PyJWTError

from app.core.config import settings
from app.models.user import User
from sqlalchemy.orm import Session
from app.db.base import get_db

logger = logging.getLogger(__name__)

# Security scheme for Bearer token authentication
security = HTTPBearer()


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """
    Verify the JWT token from Clerk.

    Args:
        credentials (HTTPAuthorizationCredentials): The HTTP Authorization credentials containing the JWT token.

    Returns:
        Dict[str, Any]: The decoded JWT payload.

    Raises:
        HTTPException: If the token is invalid.
    """
    logger.info(
        f"Verifying token: scheme={credentials.scheme}, token length="
        f"{len(credentials.credentials) if credentials.credentials else 0}"
    )
    try:
        logger.info(
            f"Using public key: {settings.CLERK_JWT_PUBLIC_KEY[:30]}..."
        )
        payload = jwt.decode(
            credentials.credentials,
            settings.CLERK_JWT_PUBLIC_KEY,
            algorithms=["RS256"],
        )
        logger.info(
            f"Token verified successfully. Payload contains: {list(payload.keys())}"
        )
        return payload
    except PyJWTError as e:
        logger.error(f"JWT verification error: {str(e)}")
        # Log the token for debugging (be careful with this in production)
        if credentials.credentials:
            logger.error(
                f"Token first 20 chars: {credentials.credentials[:20]}..."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=f"Invalid authentication token: {str(e)}"
        )


async def get_current_user_id(
    payload: Dict[str, Any] = Depends(verify_token)
) -> str:
    """
    Extract the user ID from the verified JWT payload.

    Args:
        payload (Dict[str, Any]): The decoded JWT payload.

    Returns:
        str: The user ID (sub claim).
    """
    logger.info(
        f"Extracting user ID from payload with keys: {list(payload.keys())}"
    )
    user_id = payload.get("sub")
    if not user_id:
        logger.error("No 'sub' claim found in token payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )
    logger.info(f"Extracted user ID: {user_id}")
    return user_id


async def get_current_user(
    clerk_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the current user from the database based on their Clerk user ID.

    Args:
        clerk_user_id (str): The Clerk user ID.
        db (Session): The database session.

    Returns:
        User: The user object.

    Raises:
        HTTPException: If the user is not found.
    """
    logger.info(f"Looking up user with clerk_user_id: {clerk_user_id}")
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        logger.error(f"No user found with clerk_user_id: {clerk_user_id}")
        # Check if there are any users with clerk_user_id set
        users_with_clerk_id = db.query(User).filter(
            User.clerk_user_id != None
        ).count()
        logger.info(f"Total users with clerk_user_id set: {users_with_clerk_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    logger.info(f"Found user: id={user.id}, email={user.email}")
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current active user.

    Args:
        current_user (User): The current user.

    Returns:
        User: The current active user.

    Raises:
        HTTPException: If the user is inactive.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get the current superuser.

    Args:
        current_user (User): The current active user.

    Returns:
        User: The current superuser.

    Raises:
        HTTPException: If the user is not a superuser.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a superuser",
        )
    return current_user


async def get_optional_user(
    token: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Get the current user if authenticated, otherwise return None.

    Args:
        token (Optional[HTTPAuthorizationCredentials]): The HTTP Authorization credentials.
        db (Session): The database session.

    Returns:
        Optional[User]: The user object or None.
    """
    if not token:
        return None

    try:
        payload = jwt.decode(
            token.credentials,
            settings.CLERK_JWT_PUBLIC_KEY,
            algorithms=["RS256"],
        )
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            return None
        
        user = db.query(User).filter(
            User.clerk_user_id == clerk_user_id
        ).first()
        return user
    except Exception:
        return None
