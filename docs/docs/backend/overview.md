---
sidebar_position: 1
---

# Backend Overview

The ImportCSV backend is built with FastAPI and provides the API endpoints and processing logic for handling CSV imports.

## Architecture

The backend follows a modern Python architecture with these key components:

- **FastAPI Framework**: High-performance web framework for building APIs
- **SQLAlchemy ORM**: For database interactions
- **Redis Queue (RQ)**: For background processing of imports
- **Pydantic**: For data validation and settings management
- **Alembic**: For database migrations

## Key Features

- **REST API**: Comprehensive API for managing imports
- **Background Processing**: Handling large imports asynchronously
- **Webhook System**: Notifying external systems of import events
- **Authentication**: JWT-based authentication with token refresh
- **Clerk Integration**: Optional authentication with Clerk

## API Endpoints

The backend exposes the following main API endpoints:

- `/api/v1/importers`: CRUD operations for importer configurations
- `/api/v1/imports`: Managing import jobs
- `/api/v1/auth`: Authentication endpoints
- `/api/v1/webhooks`: Webhook configuration and management
- `/api/v1/clerk`: Clerk authentication webhook handlers

## Authentication

The backend supports two authentication methods:

1. **JWT Authentication**: Built-in JWT-based authentication
2. **Clerk Authentication**: Integration with Clerk for user management

When using Clerk, the backend handles webhook events from Clerk to synchronize user data.
