import uuid

from sqlalchemy import Column, String, Boolean, DateTime, UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Made nullable for Clerk users
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Clerk integration - required for all users now
    clerk_user_id = Column(String, unique=True, index=True, nullable=False)
    profile_image = Column(String, nullable=True)

    # Relationships - using simple string references
    importers = relationship("Importer", back_populates="user")
    import_jobs = relationship("ImportJob", back_populates="user")
    webhook_events = relationship("WebhookEvent", back_populates="user")