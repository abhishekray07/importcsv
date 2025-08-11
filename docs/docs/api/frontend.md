---
sidebar_position: 2
---

# Frontend SDK Reference

This page documents the components, props, and methods available in the ImportCSV React SDK.

## CSVImporter Component

The main component for integrating CSV imports into your application.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `schema` | `object` | Yes | Schema definition for the data fields |
| `onComplete` | `function` | Yes | Callback when import is completed |
| `apiEndpoint` | `string` | No | Backend API endpoint for processing |
| `authToken` | `string` | No | Authentication token for API requests |
| `importerId` | `string` | No | ID of a pre-configured importer |
| `maxFileSize` | `number` | No | Maximum file size in MB (default: 10) |
| `allowedFileTypes` | `string[]` | No | Array of allowed file extensions |
| `theme` | `object` | No | Custom theme configuration |
| `labels` | `object` | No | Custom text labels |
| `showDownloadTemplateButton` | `boolean` | No | Show template download button |
| `templateUrl` | `string` | No | URL to download template file |
| `onError` | `function` | No | Callback for error handling |
| `onCancel` | `function` | No | Callback when import is canceled |
| `onProgress` | `function` | No | Callback for import progress updates |

### Schema Definition

The schema defines the structure of your data and validation rules:

```typescript
interface Field {
  name: string;           // Field identifier
  label: string;          // Display label
  type?: string;          // Data type (string, number, boolean, date)
  required?: boolean;     // Whether field is required
  description?: string;   // Field description
  validations?: Validation[]; // Validation rules
  defaultValue?: any;     // Default value if not provided
}

interface Validation {
  rule: string;           // Validation rule name
  value?: any;            // Value for validation (if applicable)
  errorMessage?: string;  // Custom error message
}

interface Schema {
  fields: Field[];
}
```

### Example Usage

```jsx
import { CSVImporter } from 'csv-import-react';

function MyImportComponent() {
  const schema = {
    fields: [
      {
        name: 'name',
        label: 'Full Name',
        type: 'string',
        required: true,
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'string',
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
        validations: [
          {
            rule: 'min',
            value: 18,
            errorMessage: 'Must be at least 18',
          },
        ],
      },
    ],
  };

  const handleComplete = (results) => {
    console.log('Import completed:', results);
    // Process the imported data
  };

  return (
    <CSVImporter
      schema={schema}
      onComplete={handleComplete}
      apiEndpoint="https://your-api.com/import"
      authToken="your-auth-token"
      maxFileSize={5}
      theme={{
        primaryColor: '#4f46e5',
        borderRadius: '4px',
      }}
    />
  );
}
```

## Available Validation Rules

| Rule | Description | Example |
|------|-------------|---------|
| `required` | Field must not be empty | `{ rule: 'required' }` |
| `email` | Must be valid email format | `{ rule: 'email' }` |
| `min` | Minimum value (for numbers) | `{ rule: 'min', value: 18 }` |
| `max` | Maximum value (for numbers) | `{ rule: 'max', value: 100 }` |
| `minLength` | Minimum string length | `{ rule: 'minLength', value: 3 }` |
| `maxLength` | Maximum string length | `{ rule: 'maxLength', value: 50 }` |
| `pattern` | Regex pattern match | `{ rule: 'pattern', value: '^[A-Z]' }` |
| `oneOf` | Must be one of values | `{ rule: 'oneOf', value: ['A', 'B', 'C'] }` |
| `date` | Must be valid date | `{ rule: 'date' }` |
| `custom` | Custom validation function | `{ rule: 'custom', value: (val) => val.startsWith('ABC') }` |

## Theme Customization

You can customize the appearance of the importer with the `theme` prop:

```jsx
<CSVImporter
  // ... other props
  theme={{
    primaryColor: '#4f46e5',       // Primary color for buttons and accents
    secondaryColor: '#6b7280',     // Secondary color for UI elements
    backgroundColor: '#ffffff',    // Background color
    textColor: '#111827',          // Main text color
    borderColor: '#e5e7eb',        // Border color
    borderRadius: '4px',           // Border radius for UI elements
    fontSize: '14px',              // Base font size
    fontFamily: 'sans-serif',      // Font family
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', // Box shadow
  }}
/>
```

## Custom Labels

You can customize all text labels in the UI:

```jsx
<CSVImporter
  // ... other props
  labels={{
    uploadHeader: 'Upload your CSV file',
    uploadSubheader: 'Drag and drop your file here or click to browse',
    uploadButton: 'Select file',
    mapHeader: 'Map your columns',
    mapSubheader: 'Match your CSV columns to our fields',
    requiredFieldLabel: 'Required',
    optionalFieldLabel: 'Optional',
    matchColumnLabel: 'Match column',
    noMatchLabel: 'No match',
    nextButton: 'Next',
    backButton: 'Back',
    submitButton: 'Submit',
    cancelButton: 'Cancel',
    downloadTemplateButton: 'Download template',
    // ... and many more
  }}
/>
```

## Events and Callbacks

The SDK provides several callbacks for handling the import flow:

```jsx
<CSVImporter
  // ... other props
  onComplete={(results) => {
    console.log('Import completed:', results);
    // results.data contains the processed data
    // results.stats contains import statistics
  }}
  onError={(error) => {
    console.error('Import error:', error);
  }}
  onCancel={() => {
    console.log('Import canceled by user');
  }}
  onProgress={(progress) => {
    console.log(`Import progress: ${progress.percentage}%`);
    // progress.processedRows, progress.totalRows, etc.
  }}
/>
```

## Utility Functions

The SDK also exports several utility functions:

```jsx
import { 
  parseCSV, 
  validateData, 
  generateTemplate 
} from 'csv-import-react/utils';

// Parse CSV data manually
const parsedData = parseCSV(csvString, options);

// Validate data against schema
const validationResults = validateData(data, schema);

// Generate a template CSV based on schema
const templateCSV = generateTemplate(schema);
```
