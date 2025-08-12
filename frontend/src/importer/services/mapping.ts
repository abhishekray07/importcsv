/**
 * Column mapping service with optional LLM enhancement
 */

export interface MappingSuggestion {
  uploadIndex: number;
  templateKey: string;
  confidence: number;
}

interface MappingResponse {
  success: boolean;
  mappings: MappingSuggestion[];
}

/**
 * Get enhanced column mapping suggestions from the backend
 * 
 * @param uploadColumns - Array of upload columns with name and sample_data
 * @param templateColumns - Array of template columns with key, name, and required
 * @param backendUrl - Backend API URL
 * @param importerKey - Importer key for authentication
 * @returns Array of mapping suggestions or empty array on error
 */
export async function getMappingSuggestions(
  uploadColumns: any[],
  templateColumns: any[],
  backendUrl?: string,
  importerKey?: string
): Promise<MappingSuggestion[]> {
  // Skip if missing required params
  if (!backendUrl || !importerKey || !uploadColumns.length || !templateColumns.length) {
    return [];
  }

  try {
    const response = await fetch(`${backendUrl}/api/v1/imports/key/mapping-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        importerKey,
        uploadColumns,
        templateColumns
      })
    });

    // Don't throw on non-200 status, just return empty array
    // This allows graceful fallback to string similarity
    if (!response.ok) {
      return [];
    }

    const data: MappingResponse = await response.json();
    
    if (data.success && Array.isArray(data.mappings)) {
      return data.mappings;
    }
    
    return [];
  } catch (error) {
    // Silent failure - fallback to string similarity
    return [];
  }
}

/**
 * Apply mapping suggestions to the current state
 * Only applies high-confidence suggestions that don't conflict
 * 
 * @param suggestions - Array of mapping suggestions
 * @param currentValues - Current mapping values
 * @param usedTemplateKeys - Set of already used template keys
 * @param handleTemplateChange - Function to update a column mapping
 * @returns Number of mappings applied
 */
export function applyMappingSuggestions(
  suggestions: MappingSuggestion[],
  currentValues: { [key: number]: any },
  usedTemplateKeys: Set<string>,
  handleTemplateChange: (uploadIndex: number, templateKey: string) => void
): number {
  let appliedCount = 0;
  
  // Sort by confidence (highest first)
  const sortedSuggestions = [...suggestions].sort((a, b) => b.confidence - a.confidence);
  
  for (const suggestion of sortedSuggestions) {
    // Only apply if:
    // 1. High confidence (>0.8)
    // 2. No existing mapping for this column or weak string match
    // 3. Template key is not already used
    const currentMapping = currentValues[suggestion.uploadIndex];
    const hasWeakMatch = currentMapping?.key && !currentMapping?.selected;
    
    if (
      suggestion.confidence > 0.8 &&
      (!currentMapping?.key || hasWeakMatch) &&
      !usedTemplateKeys.has(suggestion.templateKey)
    ) {
      handleTemplateChange(suggestion.uploadIndex, suggestion.templateKey);
      usedTemplateKeys.add(suggestion.templateKey);
      appliedCount++;
    }
  }
  
  console.log(`Applied ${appliedCount} high-confidence mapping suggestions`);
  return appliedCount;
}