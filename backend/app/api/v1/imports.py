import json
import logging
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Form, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.clerk import get_current_active_user
from app.db.base import get_db
from app.models.user import User
from app.models.import_job import ImportJob as ImportJobModel, ImportStatus
from app.models.webhook import WebhookEventType
from app.schemas.import_job import (
    ImportJob as ImportJobSchema,
    ImportByKeyRequest,
    ImportProcessResponse,
)
from app.services.import_service import import_service
from app.services.importer import get_importer_by_key
from app.services.queue import enqueue_job
from app.services.mapping import enhance_column_mappings
from app.services.transformation import generate_transformations

logger = logging.getLogger(__name__)

# Rate limiter will be initialized from the app state
limiter = Limiter(key_func=get_remote_address)

# Router for user-authenticated endpoints
router = APIRouter()

# Router for key-authenticated endpoints
key_router = APIRouter(prefix="/key")


@router.get("/", response_model=List[ImportJobSchema])
async def read_import_jobs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve import jobs for the current user.

    Parameters:
        db: Database session
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)
        current_user: Authenticated user making the request

    Returns:
        List of import job records for the current user
    """
    return import_service.get_import_jobs(db, str(current_user.id), skip, limit)


@router.post("/", response_model=ImportJobSchema)
async def create_import_job(
    importer_id: str = Form(...),  # UUID as string
    file_name: str = Form(...),
    column_mapping: str = Form(...),  # JSON string
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create a new import job and enqueue it for background processing.

    This endpoint creates an import job record in the database and then
    enqueues the job for asynchronous processing using Redis Queue.

    Parameters:
        importer_id: ID of the importer configuration to use
        file_name: Original name of the uploaded file
        column_mapping: JSON string mapping CSV columns to data fields
        db: Database session
        current_user: Authenticated user making the request

    Returns:
        The created import job record

    Raises:
        HTTPException: For validation errors, file not found, or server errors
    """
    try:
        # Parse column mapping
        column_mapping_dict = json.loads(column_mapping)

        import_job = await import_service.create_import_job(
            db=db,
            user_id=str(current_user.id),
            importer_id=importer_id,
            file_name=file_name,
            data=column_mapping_dict.get("data", []),
            invalid_data=column_mapping_dict.get("invalid_data", []),
        )

        return import_job

    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid column mapping JSON") from exc
    except ValueError as ve:
        logger.error("Validation error creating import job: %s", str(ve))
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except FileNotFoundError as fnf:
        logger.error("File not found: %s", str(fnf))
        raise HTTPException(status_code=404, detail=str(fnf)) from fnf
    except Exception as e:
        logger.error("Error creating import job: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error creating import job: {str(e)}"
        ) from e


@router.get("/{import_job_id}", response_model=ImportJobSchema)
async def read_import_job(
    import_job_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve a specific import job by its ID.

    This endpoint fetches details of a single import job, ensuring that
    the job belongs to the authenticated user making the request.

    Parameters:
        import_job_id: UUID of the import job to retrieve
        db: Database session
        current_user: Authenticated user making the request

    Returns:
        The requested import job record

    Raises:
        HTTPException: If the job is not found or an error occurs
    """
    try:
        import_job = import_service.get_import_job(
            db, str(current_user.id), import_job_id
        )
        if not import_job:
            raise HTTPException(status_code=404, detail="Import job not found")
        return import_job
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving import job %s: %s", import_job_id, str(e))
        raise HTTPException(
            status_code=500, detail=f"Error retrieving import job: {str(e)}"
        ) from e


# The process_import_data function has been moved to import_service.py as process_import_data_worker


@key_router.post("/process", response_model=ImportProcessResponse)
async def process_import_by_key(
    request: ImportByKeyRequest,
    db: Session = Depends(get_db),
):
    """
    Process data from the CSV importer using key-based authentication.

    This endpoint allows importing data without requiring user authentication.
    Instead, it uses the importer_key for authentication and authorization.

    The endpoint expects pre-validated data from the frontend with valid and invalid rows.
    It creates an import job and enqueues it for background processing using Redis Queue.

    Args:
        request: The import request containing valid data, invalid data, and the importer key
        db: Database session dependency

    Returns:
        The created import job object

    Raises:
        HTTPException: If the importer key is invalid or the job cannot be created
    """
    # Find the importer by key
    importer = get_importer_by_key(db, request.importer_key)

    # Extract data from the request
    valid_data = request.validData
    invalid_data = request.invalidData
    user_data = request.user
    metadata = request.metadata
    total_rows = len(valid_data) + len(invalid_data)

    # Create import job
    import_job = ImportJobModel(
        user_id=importer.user_id,  # Associate with the importer's owner
        importer_id=importer.id,
        file_name="embedded_import.csv",
        file_path="",  # No file path for frontend-processed data
        file_type="csv",
        status=ImportStatus.PROCESSING,
        row_count=total_rows,
        processed_rows=0,
        error_count=len(invalid_data),
    )
    db.add(import_job)
    db.commit()
    db.refresh(import_job)

    # Queue import.started webhook if configured
    if importer.webhook_enabled and importer.webhook_url:
        # Queue the webhook to be sent asynchronously
        webhook_payload = {
            "user": user_data or {},
            "metadata": metadata or {},
            "source": "api",
        }

        webhook_job_id = enqueue_job(
            "app.workers.webhook_worker.send_webhook",
            import_job_id=str(import_job.id),
            event_type=WebhookEventType.IMPORT_STARTED.value,
            payload_data=webhook_payload,
        )

        if webhook_job_id:
            logger.info(
                "Queued import.started webhook for job %s (webhook job: %s)",
                import_job.id, webhook_job_id
            )
        else:
            logger.warning(
                "Failed to queue import.started webhook for job %s", import_job.id
            )

    # Enqueue processing job in Redis Queue using the worker function in import_service
    job_id = enqueue_job(
        "app.services.import_service.process_import_data_worker",
        import_job_id=str(import_job.id),
        valid_data=valid_data,
        invalid_data=invalid_data,
    )

    if job_id:
        logger.info("Import job %s enqueued with RQ job ID: %s", import_job.id, job_id)
    else:
        logger.error("Failed to enqueue import job %s", import_job.id)
        # Update job status to indicate queueing failure
        import_job.status = ImportStatus.FAILED
        import_job.error_message = "Failed to enqueue job for processing"
        db.commit()

    # Return simplified response
    return ImportProcessResponse(
        success=import_job.status != ImportStatus.FAILED
    )


@key_router.post("/mapping-suggestions")
@limiter.limit("20/hour")
async def get_mapping_suggestions(
    request_data: dict,
    _request: Request,  # Prefix with _ to indicate it's required by limiter but unused
    db: Session = Depends(get_db),
):
    """
    Get enhanced column mapping suggestions using LLM.

    This endpoint uses LiteLLM to intelligently map CSV columns to template fields
    based on column names and sample data. It includes rate limiting and caching
    to prevent abuse and reduce costs.

    Parameters:
        request_data: Dict containing importerKey, uploadColumns, and templateColumns
        _request: FastAPI request object (required for rate limiting)
        db: Database session

    Returns:
        Dict with success flag and list of mapping suggestions
    """
    try:
        # Validate importer key
        importer_key = request_data.get("importerKey")
        if not importer_key:
            return {"success": False, "mappings": []}

        # Verify the importer exists (raises HTTPException if not found)
        get_importer_by_key(db, importer_key)

        # Get client IP for rate limiting
        # Note: In production, you might want to combine this with importer_key
        # for more granular rate limiting

        upload_columns = request_data.get("uploadColumns", [])
        template_columns = request_data.get("templateColumns", [])

        # Get enhanced mappings
        mappings = await enhance_column_mappings(upload_columns, template_columns)

        return {"success": True, "mappings": mappings}

    except HTTPException:
        # Re-raise HTTP exceptions (like 404 for invalid key)
        raise
    except Exception as e:
        logger.error("Error in mapping suggestions: %s", str(e))
        # Return empty mappings on error - frontend will fallback to string similarity
        return {"success": False, "mappings": []}


@key_router.post("/transform")
@limiter.limit("20/hour")
async def transform_data(
    request_data: dict,
    _request: Request,  # Prefix with _ to indicate it's required by limiter but unused
    db: Session = Depends(get_db),
):
    """
    Generate data transformations based on natural language prompt.

    This endpoint uses LLM to understand transformation requests and generate
    specific changes to apply to the data. Includes rate limiting and caching.

    Parameters:
        request_data: Dict containing prompt, data, columnMapping, and optionally targetColumns
        request: FastAPI request object
        db: Database session

    Returns:
        Dict with changes array and summary
    """
    try:
        # Validate importer key
        importer_key = request_data.get("importerKey")
        if not importer_key:
            return {
                "success": False,
                "error": "Importer key is required",
                "changes": [],
            }

        # Verify the importer exists (raises HTTPException if not found)
        get_importer_by_key(db, importer_key)

        # Extract request data
        prompt = request_data.get("prompt", "")
        data = request_data.get("data", [])
        column_mapping = request_data.get("columnMapping", {})
        target_columns = request_data.get("targetColumns")
        validation_errors = request_data.get("validationErrors")

        # Log incoming request summary
        logger.info(
            "Transform request - Rows: %d, Columns: %d, Errors: %d",
            len(data), len(column_mapping), len(validation_errors) if validation_errors else 0
        )

        # Validate prompt
        if not prompt or len(prompt.strip()) < 3:
            return {
                "success": False,
                "error": "Please provide a transformation description",
                "changes": [],
            }

        # Limit data size for safety
        max_rows = 1000
        if len(data) > max_rows:
            logger.warning("Data truncated from %d to %d rows", len(data), max_rows)

        # Generate transformations
        logger.info("Calling transformation service...")
        result = await generate_transformations(
            prompt=prompt,
            data=data,
            column_mapping=column_mapping,
            target_columns=target_columns,
            validation_errors=validation_errors,
            max_rows=max_rows,
        )

        # Log result summary
        if result.error:
            logger.error("Transformation failed: %s", result.error)
        else:
            logger.info(
                "Generated %d transformations",
                len(result.changes) if result.changes else 0
            )

        # Return result
        if result.error:
            return {"success": False, "error": result.error, "changes": []}

        return {
            "success": True,
            "changes": result.changes,
            "summary": result.summary,
            "tokensUsed": result.tokens_used,
        }

    except HTTPException:
        # Re-raise HTTP exceptions (like 404 for invalid key)
        raise
    except Exception as e:
        logger.error("Error in data transformation: %s", str(e))
        return {
            "success": False,
            "error": "Failed to generate transformations",
            "changes": [],
        }


@key_router.get("/schema")
async def get_schema_by_key(
    importer_key: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Fetch the schema for an importer using key-based authentication.

    This endpoint allows retrieving importer schema without requiring user authentication.
    Instead, it uses the importer_key for authentication and authorization.

    The schema includes field definitions, validation rules, and other configuration
    needed by the frontend CSV importer component.

    Args:
        importer_key: UUID of the importer to fetch schema for
        db: Database session dependency

    Returns:
        The importer schema with field definitions and configuration

    Raises:
        HTTPException: If the importer key is invalid
    """
    # Find the importer by key
    importer = get_importer_by_key(db, importer_key)

    # Convert UUID fields to strings
    importer.id = str(importer.id)
    importer.user_id = str(importer.user_id)

    return importer
