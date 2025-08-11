---
sidebar_position: 3
---

# Configuration

This guide covers the configuration options for ImportCSV components.

## Frontend SDK Configuration

The React SDK component accepts the following configuration options:

```jsx
<CSVImporter
  // Required props
  schema={schema}                // Your data schema definition
  onComplete={handleComplete}    // Callback when import is complete
  
  // Optional props
  apiEndpoint="https://api.example.com/import"  // Backend API endpoint
  authToken="your-auth-token"    // Authentication token
  maxFileSize={10}               // Maximum file size in MB
  allowedFileTypes={['csv', 'xlsx', 'xls']} // Allowed file types
  theme={{                       // Custom theme options
    primaryColor: '#4f46e5',
    borderRadius: '4px',
  }}
  labels={{                      // Custom labels
    uploadHeader: 'Upload your CSV file',
    mapHeader: 'Map your columns',
    uploadButton: 'Select file',
  }}
  showDownloadTemplateButton={true} // Show template download button
  templateUrl="/template.csv"    // URL to download template
/>
```

## Backend Environment Variables

The backend service can be configured using environment variables in the `.env` file:

```
# Database configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/importcsv

# Redis configuration for background tasks
REDIS_URL=redis://localhost:6379/0

# JWT Authentication
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS settings
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# File upload settings
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes
```

## Admin Dashboard Configuration

The admin dashboard can be configured using environment variables in the `.env.local` file:

```
# API configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Authentication settings
NEXT_PUBLIC_AUTH_ENABLED=true
NEXT_PUBLIC_AUTH_PROVIDER=clerk  # or 'jwt'

# Feature flags
NEXT_PUBLIC_ENABLE_WEBHOOKS=true
NEXT_PUBLIC_ENABLE_TEMPLATES=true
```

## Clerk Authentication (Optional)

If you're using Clerk for authentication, add these variables to your admin `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```
