"""
Service module for Clerk user operations.
Handles database operations for Clerk webhook events.
"""

import logging
import uuid
import secrets
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from app.models.user import User

logger = logging.getLogger(__name__)


def handle_user_created(data: Dict[str, Any], db: Session) -> Optional[User]:
    """
    Handle user.created event from Clerk

    Args:
        data: User data from Clerk webhook
        db: Database session

    Returns:
        Created or updated User object, or None if operation failed
    """
    try:
        clerk_user_id = data.get("id")
        email_addresses = data.get("email_addresses", [])

        if not clerk_user_id or not email_addresses:
            logger.error("Missing required user data from Clerk")
            return None

        # Get the primary email
        primary_email = None
        for email_obj in email_addresses:
            if email_obj.get("id") and email_obj.get("email_address"):
                primary_email = email_obj.get("email_address")
                break

        if not primary_email:
            logger.error("No valid email found in Clerk user data")
            return None

        first_name = data.get("first_name", "")
        last_name = data.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip() or None
        profile_image = data.get("profile_image_url")

        # Check if user already exists by email
        existing_user = db.query(User).filter(User.email == primary_email).first()

        if existing_user:
            # Update the existing user with Clerk ID
            existing_user.clerk_user_id = clerk_user_id
            if full_name:
                existing_user.full_name = full_name
            if profile_image:
                existing_user.profile_image = profile_image
            existing_user.is_active = True
            db.commit()
            logger.info(f"Updated existing user with Clerk ID: {primary_email}")
            return existing_user
        else:
            # Generate a placeholder password string (not used for auth)
            # This is just to satisfy the non-nullable constraint in the database
            placeholder = secrets.token_hex(16)

            # Create user directly
            new_user = User(
                id=uuid.uuid4(),
                email=primary_email,
                hashed_password=placeholder,  # Not used for authentication
                is_active=True,
                is_superuser=False,
                is_verified=True,
                full_name=full_name,
                clerk_user_id=clerk_user_id,
                profile_image=profile_image,
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            logger.info(f"Created new user from Clerk: {primary_email}")
            return new_user
    except Exception as e:
        logger.error(f"Error handling user.created: {str(e)}")
        db.rollback()
        return None


def handle_user_updated(data: Dict[str, Any], db: Session) -> Optional[User]:
    """
    Handle user.updated event from Clerk

    Args:
        data: User data from Clerk webhook
        db: Database session

    Returns:
        Updated User object, or None if operation failed
    """
    try:
        clerk_user_id = data.get("id")
        if not clerk_user_id:
            logger.error("Missing Clerk user ID")
            return None

        # Find user by Clerk ID
        user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()

        if not user:
            # Try to find by email as fallback
            email_addresses = data.get("email_addresses", [])
            primary_email = None
            for email_obj in email_addresses:
                if email_obj.get("id") and email_obj.get("email_address"):
                    primary_email = email_obj.get("email_address")
                    break

            if primary_email:
                user = db.query(User).filter(User.email == primary_email).first()

        if user:
            # Update user data
            email_addresses = data.get("email_addresses", [])
            if email_addresses:
                for email_obj in email_addresses:
                    if email_obj.get("id") and email_obj.get("email_address"):
                        user.email = email_obj.get("email_address")
                        break

            first_name = data.get("first_name")
            last_name = data.get("last_name")
            if first_name is not None or last_name is not None:
                first = first_name or ""
                last = last_name or ""
                user.full_name = f"{first} {last}".strip() or user.full_name

            profile_image = data.get("profile_image_url")
            if profile_image:
                user.profile_image = profile_image

            db.commit()
            logger.info(f"User updated from Clerk: {user.email}")
            return user
        else:
            logger.warning(f"User not found for update: {clerk_user_id}")
            return None
    except Exception as e:
        logger.error(f"Error handling user.updated: {str(e)}")
        db.rollback()
        return None


def handle_user_deleted(data: Dict[str, Any], db: Session) -> Optional[User]:
    """
    Handle user.deleted event from Clerk

    Args:
        data: User data from Clerk webhook
        db: Database session

    Returns:
        Deactivated User object, or None if operation failed
    """
    try:
        clerk_user_id = data.get("id")

        if not clerk_user_id:
            logger.error("Missing Clerk user ID")
            return None

        # Find user by Clerk ID
        user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()

        if user:
            # Soft delete by setting is_active to False
            user.is_active = False
            db.commit()
            logger.info(f"User deactivated from Clerk: {user.email}")
            return user
        else:
            logger.warning(f"User not found for deletion: {clerk_user_id}")
            return None
    except Exception as e:
        logger.error(f"Error handling user.deleted: {str(e)}")
        db.rollback()
        return None
