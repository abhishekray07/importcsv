import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Box, Flex, Text, VStack, HStack } from '../../components/ui/flex';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
// Using native HTML table elements instead of Chakra UI
import { PiCheckCircle } from 'react-icons/pi';
import { useTranslation } from '../../../i18n/useTranslation';
import { Template } from '../../types';
import stringSimilarity from '../../utils/stringSimilarity';
import { getMappingSuggestions } from '../../services/mapping';
import style from './style/ConfigureImport.module.scss';

interface ConfigureImportProps {
  template: Template;
  data: any;
  onSuccess: (mapping: any, headerRow: number) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  importerKey?: string;
  backendUrl?: string;
}

interface ColumnMapping {
  [uploadColumnIndex: number]: {
    key: string;
    name: string;
    include: boolean;
  };
}

export default function ConfigureImport({
  template,
  data,
  onSuccess,
  onCancel,
  isSubmitting = false,
  importerKey,
  backendUrl,
}: ConfigureImportProps) {
  const { t } = useTranslation();
  const selectedHeaderRow = 0; // Always use first row as headers
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState<string | null>(null);
  const llmEnhancementCalled = useRef(false);

  // Get preview data (first 5 rows)
  const previewRows = useMemo(() => {
    return data.rows.slice(0, Math.min(5, data.rows.length));
  }, [data.rows]);

  // Get column headers from first row
  const columnHeaders = useMemo(() => {
    if (data.rows[selectedHeaderRow]) {
      return data.rows[selectedHeaderRow].values;
    }
    return [];
  }, [data.rows]);

  // Prepare uploadColumns for AI mapping
  const uploadColumns = useMemo(() => {
    return columnHeaders.map((header: string, index: number) => ({
      index: index,
      name: header,
      sample_data: data.rows
        .slice(selectedHeaderRow + 1, selectedHeaderRow + 4)
        .map((row: any) => row.values[index])
        .filter((val: any) => val)
    }));
  }, [columnHeaders, data.rows, selectedHeaderRow]);

  // Get sample data for each column (skip header row)
  const getSampleData = (columnIndex: number) => {
    const startRow = selectedHeaderRow + 1;
    const samples = data.rows
      .slice(startRow, startRow + 3)
      .map((row: any) => row.values[columnIndex])
      .filter((val: any) => val);
    return samples.join(', ');
  };

  // Auto-map columns based on name similarity
  useEffect(() => {
    const autoMap: ColumnMapping = {};

    columnHeaders.forEach((header: string, index: number) => {
      let bestMatch = { column: null as any, score: 0 };

      template.columns.forEach((templateCol) => {
        const score = stringSimilarity(
          header.toLowerCase().trim(),
          templateCol.name.toLowerCase().trim()
        );

        if (score > bestMatch.score && score > 0.6) {
          bestMatch = { column: templateCol, score };
        }
      });

      if (bestMatch.column) {
        autoMap[index] = {
          key: bestMatch.column.key,
          name: bestMatch.column.name,
          include: true,
        };
      }
    });

    setColumnMapping(autoMap);
  }, [columnHeaders, template.columns]);

  // Enhance mappings with LLM suggestions after initial load
  useEffect(() => {
    const enhanceWithLLM = async () => {
      // Skip if already called
      if (llmEnhancementCalled.current) {
        return;
      }
      
      // Only run if we have columns, backend URL, and importer key
      if (!uploadColumns.length || !template.columns.length || !backendUrl || !importerKey) {
        return;
      }

      // Mark as called to prevent duplicate requests
      llmEnhancementCalled.current = true;

      try {
        // Get LLM-enhanced mapping suggestions
        const suggestions = await getMappingSuggestions(
          uploadColumns,
          template.columns,
          backendUrl,
          importerKey
        );

        if (suggestions.length > 0) {
          // Apply high-confidence suggestions that don't override existing good matches
          setColumnMapping((prevMapping) => {
            const newMapping = { ...prevMapping };
            const usedTemplateKeys = new Set(
              Object.values(prevMapping)
                .filter(v => v.key)
                .map(v => v.key)
            );

            // Sort by confidence (highest first)
            const sortedSuggestions = [...suggestions].sort((a, b) => b.confidence - a.confidence);

            for (const suggestion of sortedSuggestions) {
              // Only apply if:
              // 1. Good confidence (>0.7)
              // 2. No existing mapping or low-confidence string match
              // 3. Template key not already used
              const currentMapping = prevMapping[suggestion.uploadIndex];
              const hasWeakMatch = currentMapping?.key && !currentMapping?.include;
              
              if (
                suggestion.confidence > 0.7 &&
                (!currentMapping?.key || hasWeakMatch) &&
                !usedTemplateKeys.has(suggestion.templateKey)
              ) {
                const templateCol = template.columns.find(col => col.key === suggestion.templateKey);
                if (templateCol) {
                  newMapping[suggestion.uploadIndex] = {
                    key: suggestion.templateKey,
                    name: templateCol.name,
                    include: true,
                  };
                  usedTemplateKeys.add(suggestion.templateKey);
                }
              }
            }

            return newMapping;
          });
        }
      } catch (error) {
        // Silently fail - fallback to string similarity is already applied
      }
    };

    enhanceWithLLM();
  }, [uploadColumns, template.columns, backendUrl, importerKey]);

  // Handle column mapping change
  const handleMappingChange = (templateFieldKey: string, csvColumnIndex: string) => {
    const newMapping = { ...columnMapping };

    // Clear previous mapping for this template field
    Object.keys(newMapping).forEach((key) => {
      if (newMapping[parseInt(key)].key === templateFieldKey) {
        delete newMapping[parseInt(key)];
      }
    });

    // Set new mapping if column selected (and not "none")
    if (csvColumnIndex !== '' && csvColumnIndex !== 'none') {
      const colIndex = parseInt(csvColumnIndex);
      const templateField = template.columns.find(col => col.key === templateFieldKey);

      if (templateField) {
        newMapping[colIndex] = {
          key: templateFieldKey,
          name: templateField.name,
          include: true,
        };
      }
    }

    setColumnMapping(newMapping);
  };

  // Get CSV column index for a template field
  const getMappedColumn = (templateFieldKey: string): string => {
    const entry = Object.entries(columnMapping).find(
      ([_, mapping]) => mapping.key === templateFieldKey
    );
    return entry ? entry[0] : '';
  };

  // Check if all required fields are mapped
  const allRequiredFieldsMapped = useMemo(() => {
    const requiredFields = template.columns.filter((col: any) => col.required);
    return requiredFields.every((field: any) =>
      Object.values(columnMapping).some(mapping => mapping.key === field.key)
    );
  }, [template.columns, columnMapping]);

  // Handle form submission
  const handleSubmit = () => {
    if (!allRequiredFieldsMapped) {
      setError(t('Please map all required fields'));
      return;
    }

    setError(null);
    onSuccess(columnMapping, selectedHeaderRow);
  };

  return (
    <div className={style.configureImport}>
      <VStack className="gap-6 w-full">
        {/* Title Section */}
        <Box>
          <Text className="text-sm text-gray-600">
            {t('Map columns from imported CSV.')}
          </Text>
        </Box>

        {/* Mapping table */}
        <Box className="border border-gray-200 rounded-lg overflow-x-auto bg-white w-full">
          <table className="w-full border-collapse min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 w-[30%]">
                  <Text className="text-sm font-semibold text-gray-700">
                    {t('Fields')}
                  </Text>
                </th>
                <th className="text-left px-6 py-3 w-[35%]">
                  <Text className="text-sm font-semibold text-gray-700">
                    {t('CSV Column')}
                  </Text>
                </th>
                <th className="text-left px-6 py-3 w-[35%]">
                  <Text className="text-sm font-semibold text-gray-700">
                    {t('CSV Example Data')}
                  </Text>
                </th>
              </tr>
            </thead>
            <tbody>
              {template.columns.map((field: any, index: number) => {
                const mappedColumn = getMappedColumn(field.key);
                const isMapped = mappedColumn !== '';

                return (
                  <tr key={field.key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <HStack className="gap-2 items-center">
                        {isMapped && (
                          <PiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                        {!isMapped && field.required && (
                          <Box className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        )}
                        {!isMapped && !field.required && (
                          <Box className="w-5 h-5 flex-shrink-0" />
                        )}
                        <Text className="text-sm font-medium text-gray-900">
                          {field.name}
                          {field.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Text>
                      </HStack>
                    </td>
                    <td className="px-6 py-4">
                      <Select value={mappedColumn} onValueChange={(value) => handleMappingChange(field.key, value)}>
                        <SelectTrigger className="h-9 w-full max-w-[250px]">
                          <SelectValue placeholder={t('Select...')} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* None option to unmap */}
                          <SelectItem value="none">
                            <span className="text-gray-500">— None —</span>
                          </SelectItem>
                          
                          {/* Divider */}
                          <div className="h-px bg-gray-200 my-1" />
                          
                          {/* Column options */}
                          {columnHeaders.map((header: string, idx: number) => {
                            const isAlreadyMapped = Object.keys(columnMapping).includes(idx.toString()) &&
                              columnMapping[idx].key !== field.key;

                            return (
                              <SelectItem
                                key={idx}
                                value={idx.toString()}
                                disabled={isAlreadyMapped}
                              >
                                {isAlreadyMapped ? (
                                  <span className="text-gray-400">{header} (mapped)</span>
                                ) : (
                                  header
                                )}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4">
                      <Text className="text-sm text-gray-600 truncate max-w-[300px]" title={mappedColumn ? getSampleData(parseInt(mappedColumn)) : ''}>
                        {mappedColumn ? (getSampleData(parseInt(mappedColumn)) || '-') : ''}
                      </Text>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>

        {/* Error message */}
        {error && (
          <Box className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </Box>
        )}

        {/* Action Buttons */}
        <Flex justify="between" className="w-full pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            size="default"
          >
            {t('Back')}
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!allRequiredFieldsMapped}
            size="default"
            variant="default"
          >
            {t('Continue')}
          </Button>
        </Flex>
      </VStack>
    </div>
  );
}