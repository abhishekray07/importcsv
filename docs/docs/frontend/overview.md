---
sidebar_position: 1
---

# Frontend SDK Overview

The ImportCSV Frontend SDK is a React component library that provides a complete CSV import experience for your web applications.

## Key Features

- **File Upload**: Drag-and-drop interface for CSV, XLS, XLSX, and TSV files
- **Column Mapping**: Interactive UI for mapping source columns to destination fields
- **Data Validation**: Real-time validation with error feedback
- **Customizable UI**: Theming and label customization options
- **TypeScript Support**: Full TypeScript definitions for type safety

## Installation

Install the SDK in your React project:

```bash
# Using npm
npm install csv-import-react

# Using yarn
yarn add csv-import-react
```

## Basic Usage

Here's a simple example of using the ImportCSV component:

```jsx
import React from 'react';
import { CSVImporter } from 'csv-import-react';

function MyImportComponent() {
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
      },
    ],
  };

  // Handle import completion
  const handleComplete = (results) => {
    console.log('Import completed:', results);
    // Process the imported data
  };

  return (
    <CSVImporter
      schema={schema}
      onComplete={handleComplete}
      apiEndpoint="https://your-api.com/import"
    />
  );
}

export default MyImportComponent;
```

## Import Flow

The SDK guides users through a step-by-step import process:

1. **File Upload**: User uploads a CSV or spreadsheet file
2. **Column Mapping**: User maps source columns to destination fields
3. **Validation**: Data is validated against the schema
4. **Review**: User reviews the data before finalizing
5. **Processing**: Data is sent to the backend for processing
6. **Completion**: User receives confirmation and results

## Next Steps

- [View the API reference](../api/frontend.md)
- [See examples](../examples.md)
