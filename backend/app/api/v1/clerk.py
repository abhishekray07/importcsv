import json
import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from svix.webhooks import Webhook

from app.core.config import settings
from app.db.base import get_db
from app.services import clerk_user

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
    user = clerk_user.handle_user_created(data, db)
    return user

async def handle_user_updated(data: Dict[str, Any], db: Session):
    """
    Handle user.updated event from Clerk
    """
    user = clerk_user.handle_user_updated(data, db)
    return user

async def handle_user_deleted(data: Dict[str, Any], db: Session):
    """
    Handle user.deleted event from Clerk
    """
    user = clerk_user.handle_user_deleted(data, db)
    return user

# The sync-user endpoint has been removed as it's no longer needed.
# User synchronization now happens solely through Clerk webhooks.
