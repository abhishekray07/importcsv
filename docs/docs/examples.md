---
sidebar_position: 7
---

# Examples

This page provides practical examples of using ImportCSV in different scenarios.

## Basic React Integration

Here's a simple example of integrating the ImportCSV component in a React application:

```jsx
import React, { useState } from 'react';
import { CSVImporter } from 'csv-import-react';

function ImportPage() {
  const [importResults, setImportResults] = useState(null);
  
  // Define your data schema
  const schema = {
    fields: [
      {
        name: 'name',
        label: 'Name',
        required: true,
      },
      {
        name: 'email',
        label: 'Email',
        required: true,
        validations: [
          {
            rule: 'email',
            errorMessage: 'Invalid email format',
          },
        ],
      },
      {
        name: 'company',
        label: 'Company',
        required: false,
      },
    ],
  };

  const handleComplete = (results) => {
    setImportResults(results);
    // You can now process the data or send it to your backend
  };

  return (
    <div className="import-container">
      <h1>Import Contacts</h1>
      
      {!importResults ? (
        <CSVImporter
          schema={schema}
          onComplete={handleComplete}
          apiEndpoint="https://your-api.com/import"
          authToken="your-auth-token"
        />
      ) : (
        <div className="results">
          <h2>Import Completed!</h2>
          <p>Successfully imported {importResults.data.length} records.</p>
          <button onClick={() => setImportResults(null)}>
            Start New Import
          </button>
        </div>
      )}
    </div>
  );
}

export default ImportPage;
```

## Integration with Next.js

Here's how to use ImportCSV in a Next.js application:

```jsx
// pages/import.js
import React from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';

// Import the component dynamically to avoid SSR issues
const CSVImporter = dynamic(
  () => import('csv-import-react').then((mod) => mod.CSVImporter),
  { ssr: false }
);

export default function ImportPage() {
  const { data: session } = useSession();
  
  // Only show the importer if the user is authenticated
  if (!session) {
    return <div>Please sign in to access the import tool</div>;
  }
  
  const schema = {
    fields: [
      // Your schema fields here
    ],
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Import Data</h1>
      <CSVImporter
        schema={schema}
        onComplete={(results) => {
          console.log('Import completed:', results);
        }}
        apiEndpoint="/api/import"
        // Use the session token for authentication
        authToken={session.accessToken}
      />
    </div>
  );
}
```

## Using with Clerk Authentication

If you're using Clerk for authentication, you can integrate it with ImportCSV:

```jsx
import React from 'react';
import { CSVImporter } from 'csv-import-react';
import { useAuth } from '@clerk/clerk-react';

function ImportWithClerk() {
  const { getToken } = useAuth();
  
  const schema = {
    fields: [
      // Your schema fields here
    ],
  };
  
  const getAuthToken = async () => {
    // Get the token from Clerk
    return await getToken();
  };
  
  return (
    <div>
      <h1>Import with Clerk Authentication</h1>
      <CSVImporter
        schema={schema}
        onComplete={(results) => {
          console.log('Import completed:', results);
        }}
        apiEndpoint="/api/import"
        // Pass a function that returns the token
        authTokenProvider={getAuthToken}
      />
    </div>
  );
}

export default ImportWithClerk;
```

## Custom Styling with Tailwind CSS

Here's an example of customizing the ImportCSV component with Tailwind CSS:

```jsx
import React from 'react';
import { CSVImporter } from 'csv-import-react';

function TailwindStyledImporter() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Import Customer Data
      </h1>
      
      <CSVImporter
        schema={{
          fields: [
            // Your schema fields here
          ],
        }}
        onComplete={(results) => {
          console.log('Import completed:', results);
        }}
        apiEndpoint="/api/import"
        // Custom theme that works with Tailwind
        theme={{
          primaryColor: '#4f46e5', // Indigo-600
          borderRadius: '0.375rem', // Rounded-md
          fontSize: '0.875rem', // Text-sm
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
        // Custom CSS classes
        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
        buttonClassName="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md"
      />
    </div>
  );
}

export default TailwindStyledImporter;
```

## Backend Webhook Handler Example

Here's an example of a backend webhook handler for import events:

```python
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, verify_webhook_signature
from app.models import ImportJob, WebhookEvent
import json

router = APIRouter()

@router.post("/webhooks/import-events")
async def handle_import_webhook(
    request: Request,
    signature: str = Header(..., alias="X-Webhook-Signature"),
    db: Session = Depends(get_db)
):
    # Verify the webhook signature
    payload = await request.body()
    if not verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    # Parse the webhook payload
    data = json.loads(payload)
    event_type = data.get("event")
    import_id = data.get("import_id")
    
    # Record the webhook event
    webhook_event = WebhookEvent(
        event_type=event_type,
        payload=data,
        import_id=import_id
    )
    db.add(webhook_event)
    
    # Process based on event type
    if event_type == "import.completed":
        # Handle completed import
        import_job = db.query(ImportJob).filter(ImportJob.id == import_id).first()
        if import_job:
            # Process the completed import
            process_completed_import(import_job, data)
    
    db.commit()
    return {"status": "success"}
```

These examples demonstrate different ways to integrate and use ImportCSV in your applications. For more detailed information, refer to the specific documentation sections.
