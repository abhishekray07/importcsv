import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.base import get_db
from app.auth.users import get_current_active_user
from app.models.user import User
from app.schemas.importer import ImporterCreate, ImporterUpdate, Importer as ImporterSchema
from app.services import importer as importer_service

router = APIRouter()

@router.get("/", response_model=List[ImporterSchema])
async def read_importers(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve importers
    """
    return importer_service.get_importers(db, str(current_user.id), skip, limit)


@router.post("/", response_model=ImporterSchema)
async def create_importer(
    importer_in: ImporterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create new importer
    """
    return importer_service.create_importer(db, str(current_user.id), importer_in)


@router.get("/{importer_id}", response_model=ImporterSchema)
async def read_importer(
    importer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get importer by ID
    """
    importer = importer_service.get_importer(db, str(current_user.id), importer_id)
    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")
    return importer


@router.put("/{importer_id}", response_model=ImporterSchema)
async def update_importer(
    importer_id: uuid.UUID,
    importer_in: ImporterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update an importer
    """
    importer = importer_service.update_importer(db, str(current_user.id), importer_id, importer_in)
    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")
    return importer

@router.delete("/{importer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_importer(
    importer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete an importer
    """
    importer = importer_service.delete_importer(db, str(current_user.id), importer_id)
    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")
    return None
