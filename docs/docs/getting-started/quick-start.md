---
sidebar_position: 2
---

# Quick Start

This guide will help you quickly integrate ImportCSV into your application.

## Using the React SDK

After installing the SDK, you can use the ImportCSV component in your React application:

```jsx
import React from 'react';
import { CSVImporter } from 'csv-import-react';

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
      name: 'age',
      label: 'Age',
      type: 'number',
    },
  ],
};

function MyImportComponent() {
  const handleComplete = (results) => {
    console.log('Import completed:', results);
    // Process the imported data
  };

  return (
    <CSVImporter
      schema={schema}
      onComplete={handleComplete}
      apiEndpoint="https://your-api.com/import"
      authToken="your-auth-token" // Optional: for authenticated requests
    />
  );
}

export default MyImportComponent;
```

## Backend Integration

To handle the imported data on your backend, set up an endpoint that receives the data:

```python
from fastapi import FastAPI, Depends, HTTPException
from app.models import ImportJob
from app.schemas import ImportJobCreate
from app.dependencies import get_db

app = FastAPI()

@app.post("/api/v1/imports/")
def create_import_job(
    import_job: ImportJobCreate,
    db: Session = Depends(get_db)
):
    # Create a new import job
    db_import_job = ImportJob(
        name=import_job.name,
        status="pending",
        file_path=import_job.file_path,
        mapping=import_job.mapping
    )
    
    db.add(db_import_job)
    db.commit()
    db.refresh(db_import_job)
    
    # Process the import in the background
    process_import.delay(db_import_job.id)
    
    return db_import_job
```

## Next Steps

- [Configure your ImportCSV instance](configuration.md)
- [Learn about the admin dashboard](../admin/overview.md)
- [Explore the API reference](../api/backend.md)
