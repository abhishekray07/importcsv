# ImportCSV Backend

<div align="center">
  <em>FastAPI-based backend service for ImportCSV with Redis Queue for background processing</em>

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../LICENSE)

</div>

## 🚀 Overview

The ImportCSV backend is built with FastAPI and provides a robust API for processing CSV and spreadsheet imports. It handles file validation, column mapping, data transformation, and integration with external systems.

## ✨ Features

- **🔄 Background Processing** - Redis Queue for handling large imports asynchronously
- **🔒 Authentication** - Clerk-based authentication with webhook sync
- **📊 Data Validation** - Pydantic models for robust validation
- **🔌 Extensible** - Webhook services for real-time notifications

## 🏗️ Architecture

The backend follows a clean architecture with separation of concerns:

- **API Layer** - FastAPI routes and endpoints
- **Service Layer** - Business logic and coordination
- **Data Access Layer** - SQLAlchemy models and database interactions
- **Worker Layer** - Background job processing with Redis Queue

## 🛠️ Technical Details

### Key Components

- **ImportService** - Core service that handles all import business logic
- **Queue Service** - Manages background job processing with Redis Queue
- **Authentication** - Clerk integration with JWT verification
- **Database** - PostgreSQL with SQLAlchemy ORM

### Directory Structure

```
backend/
├── app/
│   ├── api/             # API endpoints
│   ├── core/            # Core configuration
│   ├── db/              # Database models and session management
│   ├── schemas/         # Pydantic schemas for validation
│   ├── services/        # Business logic services
│   │   └── import_service.py  # Consolidated import functionality
│   ├── worker.py        # Background job processing
│   └── main.py          # Application entry point
├── migrations/          # Alembic database migrations
├── tests/               # Unit and integration tests
└── requirements.txt     # Python dependencies
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL
- Redis

### Installation

1. Create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run database migrations:

   ```bash
   alembic upgrade head
   ```

5. Start the development server:

   ```bash
   uvicorn app.main:app --reload
   ```

6. Start the worker (in a separate terminal):
   ```bash
   python -m app.worker
   ```

### Clerk Authentication Setup

ImportCSV uses Clerk for authentication. You need to:

1. **Create a Clerk account** at [clerk.com](https://clerk.com)

2. **Configure Clerk webhook**:
   - Go to Clerk Dashboard > Webhooks
   - Add endpoint: `https://your-domain/api/v1/clerk/webhook`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy the webhook secret

3. **Get Clerk keys**:
   - Go to Clerk Dashboard > API Keys
   - Copy the JWT public key

4. **Update your `.env` file**:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_xxxxx  # From webhook configuration
   CLERK_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
   YOUR_PUBLIC_KEY_HERE
   -----END PUBLIC KEY-----
   ```

### Environment Variables

Key environment variables:

```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/importcsv

# Redis Queue
REDIS_URL=redis://localhost:6379/0
RQ_DEFAULT_TIMEOUT=360
RQ_IMPORT_QUEUE=imports

# Security
SECRET_KEY=your-secret-key-at-least-32-characters

# Clerk Authentication (Required)
CLERK_WEBHOOK_SECRET=whsec_xxxxx
CLERK_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...

# Webhook (for import callbacks)
WEBHOOK_SECRET=your-webhook-secret
```

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](../LICENSE) file for details.
