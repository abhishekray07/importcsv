import json
import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session

from app.auth.clerk import get_current_active_user
from app.db.base import get_db
from app.models.user import User
from app.models.import_job import ImportJob as ImportJobModel, ImportStatus
from app.schemas.import_job import (
    ImportJob as ImportJobSchema,
    ImportByKeyRequest,
    ImportProcessResponse,
)
from app.services.import_service import (
    import_service,
    log_import_started,
)
from app.services.importer import get_importer_by_key
from app.services.queue import enqueue_job

logger = logging.getLogger(__name__)

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

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column mapping JSON")
    except ValueError as ve:
        logger.error(f"Validation error creating import job: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except FileNotFoundError as fnf:
        logger.error(f"File not found: {str(fnf)}")
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        logger.error(f"Error creating import job: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error creating import job: {str(e)}"
        )


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
    except Exception as e:
        logger.error(f"Error retrieving import job {import_job_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving import job: {str(e)}"
        )


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

    # Enqueue processing job in Redis Queue using the worker function in import_service
    job_id = enqueue_job(
        "app.services.import_service.process_import_data_worker",
        import_job_id=str(import_job.id),
        valid_data=valid_data,
        invalid_data=invalid_data,
    )

    if job_id:
        logger.info(f"Import job {import_job.id} enqueued with RQ job ID: {job_id}")
    else:
        logger.error(f"Failed to enqueue import job {import_job.id}")
        # Update job status to indicate queueing failure
        import_job.status = ImportStatus.FAILED
        import_job.error_message = "Failed to enqueue job for processing"
        db.commit()

    # Log the import started event
    log_import_started(
        importer_id=importer.id,
        import_job_id=import_job.id,
        row_count=total_rows,
        user_data=user_data,
        metadata=metadata,
    )

    # Return simplified response
    if import_job.status == ImportStatus.FAILED:
        return ImportProcessResponse(
            success=False,
        )
    else:
        return ImportProcessResponse(
            success=True,
        )


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
