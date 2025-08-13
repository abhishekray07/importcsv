/**
 * Natural language data transformation service
 */

export interface TransformationChange {
  rowIndex: number;
  columnKey: string;
  columnIndex?: number;  // Column index for direct array access
  oldValue: any;
  newValue: any;
  confidence: number;
  selected: boolean;
}

export interface TransformationResponse {
  success: boolean;
  changes: TransformationChange[];
  summary: string;
  error?: string;
  tokensUsed?: number;
}

export interface ValidationError {
  rowIndex: number;
  columnKey: string;
  message: string;
  value?: any;
}

export interface TransformationRequest {
  prompt: string;
  data: any[];
  columnMapping: Record<string, any>;
  targetColumns?: string[];
  validationErrors?: ValidationError[];
}

/**
 * Generate data transformations based on natural language prompt
 * 
 * @param prompt - Natural language description of the transformation
 * @param data - Current data rows
 * @param columnMapping - Mapping of columns
 * @param backendUrl - Backend API URL
 * @param importerKey - Importer key for authentication
 * @param targetColumns - Optional specific columns to transform
 * @param validationErrors - Optional validation errors for context
 * @returns Transformation preview with changes
 */
export async function generateTransformations(
  prompt: string,
  data: any[],
  columnMapping: Record<string, any>,
  backendUrl: string,
  importerKey: string,
  targetColumns?: string[],
  validationErrors?: ValidationError[]
): Promise<TransformationResponse> {
  // Validate inputs
  if (!prompt || prompt.trim().length < 3) {
    return {
      success: false,
      changes: [],
      summary: "",
      error: "Please describe the transformation you want to apply"
    };
  }

  if (!backendUrl || !importerKey) {
    return {
      success: false,
      changes: [],
      summary: "",
      error: "Missing configuration"
    };
  }

  try {
    const response = await fetch(`${backendUrl}/api/v1/imports/key/transform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        importerKey,
        prompt,
        data,
        columnMapping,
        targetColumns,
        validationErrors
      })
    });

    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        return {
          success: false,
          changes: [],
          summary: "",
          error: "Rate limit exceeded. Please try again later."
        };
      }
      
      // Handle other errors
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        changes: [],
        summary: "",
        error: errorData.error || "Failed to generate transformations"
      };
    }

    const result: TransformationResponse = await response.json();
    
    // Ensure all changes have the selected property
    if (result.changes) {
      result.changes = result.changes.map(change => ({
        ...change,
        selected: change.selected !== false // Default to true
      }));
    }
    
    return result;
    
  } catch (error) {
    console.error('Transformation service error:', error);
    return {
      success: false,
      changes: [],
      summary: "",
      error: "Network error. Please check your connection."
    };
  }
}

/**
 * Apply selected transformations to the data
 * 
 * @param data - Original data rows
 * @param changes - List of transformation changes
 * @param onlySelected - Whether to apply only selected changes
 * @returns Modified data with transformations applied
 */
export function applyTransformations(
  data: any[],
  changes: TransformationChange[],
  onlySelected: boolean = true
): any[] {
  // Create a deep copy of the data
  const modifiedData = JSON.parse(JSON.stringify(data));
  
  // Apply each change
  for (const change of changes) {
    // Skip if not selected and we're only applying selected
    if (onlySelected && !change.selected) {
      continue;
    }
    
    const { rowIndex, columnIndex, newValue } = change;
    
    // Validate row index
    if (rowIndex < 0 || rowIndex >= modifiedData.length) {
      console.warn(`Invalid row index: ${rowIndex}`);
      continue;
    }
    
    // Apply the transformation
    const row = modifiedData[rowIndex];
    if (row && row.values && columnIndex !== undefined) {
      // Direct array access using columnIndex
      row.values[columnIndex] = newValue;
    }
  }
  
  return modifiedData;
}

/**
 * Count selected changes
 */
export function countSelectedChanges(changes: TransformationChange[]): number {
  return changes.filter(c => c.selected).length;
}

/**
 * Toggle selection for a specific change
 */
export function toggleChangeSelection(
  changes: TransformationChange[],
  index: number
): TransformationChange[] {
  return changes.map((change, i) => 
    i === index 
      ? { ...change, selected: !change.selected }
      : change
  );
}

/**
 * Select or deselect all changes
 */
export function setAllChangesSelection(
  changes: TransformationChange[],
  selected: boolean
): TransformationChange[] {
  return changes.map(change => ({ ...change, selected }));
}

/**
 * Common transformation prompts for quick access
 */
export const COMMON_PROMPTS = [
  "Convert all dates to MM/DD/YYYY format",
  "Convert all dates to YYYY-MM-DD format",
  "Remove special characters from phone numbers",
  "Format phone numbers as (XXX) XXX-XXXX",
  "Capitalize all names",
  "Convert text to uppercase",
  "Convert text to lowercase",
  "Trim extra spaces",
  "Fill empty values with 'N/A'",
  "Remove dollar signs and commas from amounts"
];