---
sidebar_position: 1
---

# Backend API Reference

This page documents the REST API endpoints provided by the ImportCSV backend.

## Authentication

Most API endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Get Access Token

```
POST /api/v1/auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

## Importers

### List Importers

```
GET /api/v1/importers
```

**Response:**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Customer Import",
      "description": "Import customer data",
      "schema": { ... },
      "created_at": "2025-04-30T14:28:23.382Z",
      "updated_at": "2025-04-30T14:28:23.382Z"
    }
  ],
  "total": 1
}
```

### Create Importer

```
POST /api/v1/importers
```

**Request Body:**

```json
{
  "name": "Customer Import",
  "description": "Import customer data",
  "schema": {
    "fields": [
      {
        "name": "name",
        "label": "Name",
        "type": "string",
        "required": true
      },
      {
        "name": "email",
        "label": "Email",
        "type": "string",
        "required": true,
        "validations": [
          {
            "rule": "email",
            "errorMessage": "Invalid email format"
          }
        ]
      }
    ]
  }
}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Import",
  "description": "Import customer data",
  "schema": { ... },
  "created_at": "2025-05-01T14:28:23.382Z",
  "updated_at": "2025-05-01T14:28:23.382Z"
}
```

### Get Importer

```
GET /api/v1/importers/{importer_id}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Customer Import",
  "description": "Import customer data",
  "schema": { ... },
  "created_at": "2025-05-01T14:28:23.382Z",
  "updated_at": "2025-05-01T14:28:23.382Z"
}
```

### Update Importer

```
PUT /api/v1/importers/{importer_id}
```

**Request Body:**

```json
{
  "name": "Updated Customer Import",
  "description": "Updated description",
  "schema": { ... }
}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Customer Import",
  "description": "Updated description",
  "schema": { ... },
  "created_at": "2025-05-01T14:28:23.382Z",
  "updated_at": "2025-05-01T15:42:12.123Z"
}
```

### Delete Importer

```
DELETE /api/v1/importers/{importer_id}
```

**Response:**

```
204 No Content
```

## Import Jobs

### Create Import Job

```
POST /api/v1/imports
```

**Request Body (multipart/form-data):**

- `file`: CSV file to import
- `importer_id`: ID of the importer to use
- `mapping`: JSON string of column mappings

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "importer_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "file_name": "customers.csv",
  "row_count": 1000,
  "created_at": "2025-05-01T16:28:23.382Z"
}
```

### Get Import Job Status

```
GET /api/v1/imports/{import_id}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "importer_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "file_name": "customers.csv",
  "row_count": 1000,
  "processed_rows": 450,
  "error_count": 2,
  "created_at": "2025-05-01T16:28:23.382Z",
  "updated_at": "2025-05-01T16:30:45.123Z"
}
```

### List Import Jobs

```
GET /api/v1/imports
```

**Query Parameters:**

- `importer_id`: Filter by importer ID
- `status`: Filter by status
- `page`: Page number
- `limit`: Items per page

**Response:**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "importer_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "file_name": "customers.csv",
      "row_count": 1000,
      "processed_rows": 1000,
      "error_count": 5,
      "created_at": "2025-05-01T16:28:23.382Z",
      "completed_at": "2025-05-01T16:35:12.456Z"
    }
  ],
  "total": 1
}
```

## Webhooks

### Create Webhook

```
POST /api/v1/webhooks
```

**Request Body:**

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["import.completed", "import.failed"],
  "description": "Notification webhook for import events"
}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "url": "https://your-app.com/webhook",
  "events": ["import.completed", "import.failed"],
  "description": "Notification webhook for import events",
  "secret": "whsec_abcdefghijklmnopqrstuvwxyz",
  "created_at": "2025-05-01T17:28:23.382Z"
}
```

For more detailed API documentation, refer to the OpenAPI specification available at `/docs` when running the backend server.
