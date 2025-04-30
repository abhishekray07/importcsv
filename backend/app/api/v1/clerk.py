from typing import Dict, Any
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from svix.webhooks import Webhook

from app.db.base import get_db
from app.models.user import User
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Verify Clerk webhook signature
async def verify_clerk_webhook(request: Request) -> Dict[str, Any]:
    """
    Verify the Clerk webhook signature using the SVIX library
    """
    if not settings.CLERK_WEBHOOK_SECRET:
        logger.error("Clerk webhook secret not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk webhook secret not configured",
        )
    
    try:
        # Create a Webhook instance with the secret
        wh = Webhook(settings.CLERK_WEBHOOK_SECRET)
        
        # Get the raw body
        payload = await request.body()
        
        # Get headers and convert to lowercase for svix library
        headers = {k.lower(): v for k, v in request.headers.items()}
        
        # Verify the webhook
        payload_str = payload.decode("utf-8")
        wh.verify(payload, headers)
        
        # Parse the body as JSON
        return json.loads(payload_str)
    except Exception as e:
        logger.error(f"Error verifying webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error verifying webhook: {str(e)}",
        )

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def clerk_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Handle Clerk webhooks for user events
    """
    try:
        # Verify and parse the webhook
        payload = await verify_clerk_webhook(request)
        
        # Get the event type
        event_type = payload.get("type")
        
        if not event_type:
            logger.error("Missing event type in webhook payload")
            return {"status": "error", "message": "Missing event type"}
        
        logger.info(f"Received Clerk webhook event: {event_type}")
        
        # Handle different event types
        if event_type == "user.created":
            await handle_user_created(payload.get("data", {}), db)
        elif event_type == "user.updated":
            await handle_user_updated(payload.get("data", {}), db)
        elif event_type == "user.deleted":
            await handle_user_deleted(payload.get("data", {}), db)
        else:
            logger.info(f"Unhandled event type: {event_type}")
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error processing Clerk webhook: {str(e)}")
        # Return 200 to acknowledge receipt even if processing fails
        # This prevents Clerk from retrying the webhook unnecessarily
        return {"status": "error", "message": str(e)}

async def handle_user_created(data: Dict[str, Any], db: Session):
    """
    Handle user.created event from Clerk
    """
    try:
        clerk_user_id = data.get("id")
        email_addresses = data.get("email_addresses", [])
        
        if not clerk_user_id or not email_addresses:
            logger.error("Missing required user data from Clerk")
            return
        
        # Get the primary email
        primary_email = None
        for email_obj in email_addresses:
            if email_obj.get("id") and email_obj.get("email_address"):
                primary_email = email_obj.get("email_address")
                break
        
        if not primary_email:
            logger.error("No valid email found in Clerk user data")
            return
        
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
        else:
            # Create a new user directly in the database
            import uuid
            import secrets
            import string
            
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
                profile_image=profile_image
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            logger.info(f"Created new user from Clerk: {primary_email}")
    except Exception as e:
        logger.error(f"Error handling user.created: {str(e)}")
        db.rollback()

async def handle_user_updated(data: Dict[str, Any], db: Session):
    """
    Handle user.updated event from Clerk
    """
    try:
        clerk_user_id = data.get("id")
        if not clerk_user_id:
            logger.error("Missing Clerk user ID")
            return
        
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
        else:
            logger.warning(f"User not found for update: {clerk_user_id}")
    except Exception as e:
        logger.error(f"Error handling user.updated: {str(e)}")
        db.rollback()

async def handle_user_deleted(data: Dict[str, Any], db: Session):
    """
    Handle user.deleted event from Clerk
    """
    try:
        clerk_user_id = data.get("id")
        
        if not clerk_user_id:
            logger.error("Missing Clerk user ID")
            return
        
        # Find user by Clerk ID
        user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
        
        if user:
            # Soft delete by setting is_active to False
            user.is_active = False
            db.commit()
            logger.info(f"User deactivated from Clerk: {user.email}")
        else:
            logger.warning(f"User not found for deletion: {clerk_user_id}")
    except Exception as e:
        logger.error(f"Error handling user.deleted: {str(e)}")
        db.rollback()

# The sync-user endpoint has been removed as it's no longer needed.
# User synchronization now happens solely through Clerk webhooks.
