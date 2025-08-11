---
sidebar_position: 2
---

# Creating a New Importer

This guide walks you through the process of creating a new importer in the ImportCSV Admin Dashboard.

## What is an Importer?

An importer is a configuration that defines how CSV data should be processed. It includes:

- The schema of the data (field names, types, validations)
- Mapping rules for matching CSV columns to your data fields
- Processing options (e.g., batch size, error handling)
- Webhook notifications for import events

## Step-by-Step Guide

### 1. Navigate to the Importers Section

From the dashboard sidebar, click on **Importers** and then click the **Create Importer** button in the top-right corner.

### 2. Define Basic Information

Fill in the basic information for your importer:

- **Name**: A descriptive name for your importer (e.g., "Customer Data Import")
- **Description**: Optional details about the purpose of this importer
- **Destination**: Where the imported data will be sent (e.g., database table, API endpoint)

### 3. Configure the Schema

Define the data schema by adding fields:

1. Click **Add Field** to add a new field
2. For each field, specify:
   - **Name**: The field identifier (e.g., "email")
   - **Label**: Human-readable label (e.g., "Email Address")
   - **Type**: Data type (string, number, boolean, date, etc.)
   - **Required**: Whether the field is required
   - **Validations**: Rules to validate the data (e.g., email format, min/max values)

Example schema configuration:

```json
{
  "fields": [
    {
      "name": "name",
      "label": "Full Name",
      "type": "string",
      "required": true
    },
    {
      "name": "email",
      "label": "Email Address",
      "type": "string",
      "required": true,
      "validations": [
        {
          "rule": "email",
          "errorMessage": "Invalid email format"
        }
      ]
    },
    {
      "name": "age",
      "label": "Age",
      "type": "number",
      "validations": [
        {
          "rule": "min",
          "value": 18,
          "errorMessage": "Must be at least 18"
        }
      ]
    }
  ]
}
```

### 4. Configure Processing Options

Set options for how the data should be processed:

- **Batch Size**: Number of rows to process in each batch
- **Skip Header Row**: Whether to skip the first row of the CSV
- **Duplicate Handling**: How to handle duplicate records
- **Error Handling**: What to do when validation errors occur

### 5. Set Up Webhooks (Optional)

Configure webhooks to notify your systems when import events occur:

1. Click **Add Webhook**
2. Enter the webhook URL
3. Select the events to trigger the webhook:
   - Import Started
   - Import Completed
   - Import Failed
   - Row Processed
   - Row Failed

### 6. Save the Importer

Click **Save Importer** to create your new importer configuration.

## Using Your Importer

Once created, your importer can be used in several ways:

### From the Admin Dashboard

1. Go to the Importers list
2. Click on your importer
3. Click **Start Import**
4. Upload a CSV file and follow the guided process

### From Your Application

Use the ImportCSV React component with your importer ID:

```jsx
import { CSVImporter } from 'csv-import-react';

function MyImportComponent() {
  return (
    <CSVImporter
      importerId="your-importer-id"
      apiEndpoint="https://your-api.com/import"
      authToken="your-auth-token"
      onComplete={(results) => {
        console.log('Import completed:', results);
      }}
    />
  );
}
```

## Managing Imports

After creating an importer, you can:

- **Edit**: Update the importer configuration
- **Duplicate**: Create a copy of the importer
- **Delete**: Remove the importer (this won't affect past import jobs)
- **View History**: See all import jobs that used this importer
