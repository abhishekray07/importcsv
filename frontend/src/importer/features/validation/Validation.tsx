import React, { useState, useMemo, FormEvent } from 'react';
import { Button, Flex, Text, Box, Switch, Tooltip, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { ValidationProps } from './types';
import style from './style/Validation.module.scss';


// Validation component for checking imported data
export default function Validation({
  template,
  data: fileData,
  columnMapping,
  selectedHeaderRow,
  onSuccess,
  onCancel,
  isSubmitting,
  backendUrl,
  filterInvalidRows,
  disableOnInvalidRows,
}: ValidationProps) {
  // State management
  const [editedValues, setEditedValues] = useState<Record<number, Record<number, any>>>({});
  const [errors, setErrors] = useState<Array<{rowIndex: number, columnIndex: number, message: string}>>([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // Data extraction
  const headerRowIndex = selectedHeaderRow || 0;
  const headerRow = fileData.rows[headerRowIndex];
  const dataRows = fileData.rows.slice(headerRowIndex + 1);

  // Column mapping
  const includedColumns = useMemo(() => {
    return Object.entries(columnMapping)
      .filter(([_, mapping]) => mapping.include)
      .map(([index]) => parseInt(index));
  }, [columnMapping]);

  // Headers
  const headers = useMemo(() => {
    return includedColumns.map(colIdx => String(headerRow.values[colIdx]));
  }, [includedColumns, headerRow]);

  // Validation tracking
  const shouldValidateRef = React.useRef(true);

  // Stable reference for edited values
  const editedValuesRef = React.useRef(editedValues);
  React.useEffect(() => {
    editedValuesRef.current = editedValues;
    shouldValidateRef.current = true;
  }, [editedValues]);

  // Validate column mappings
  React.useEffect(() => {
    // Check if mappings match template fields
    const templateKeys = template.columns.map(col => col.key);
    const mismatches = Object.entries(columnMapping).filter(([_, mapping]) => {
      if (!mapping.include) return false;
      return !templateKeys.includes(mapping.key);
    });

    if (mismatches.length > 0) {

    }
  }, [template, columnMapping]);

  // Data validation
  const validateData = React.useCallback(() => {
    if (!shouldValidateRef.current) return;

    const newErrors: Array<{rowIndex: number, columnIndex: number, message: string}> = [];

    // For each row in the data
    dataRows.forEach((row, rowIdx) => {
      const displayRowIndex = rowIdx + headerRowIndex + 1;

      // For each column mapping
      Object.entries(columnMapping).forEach(([colIndexStr, mapping]) => {
        if (!mapping.include) return;

        // The column index in the data
        const colIdx = parseInt(colIndexStr);
        if (isNaN(colIdx)) return;

        // The key in the template
        const templateField = mapping.key;

        // Find the corresponding template field
        const field = template.columns.find(col => col.key === templateField);
        if (!field) {

          return;
        }

        // Get the value (use edited value if available)
        const originalValue = row.values[colIdx];
        const editedValue = editedValuesRef.current[rowIdx]?.[colIdx];
        const value = editedValue !== undefined ? editedValue : originalValue;

        // Access field properties safely
        const fieldAny = field as any;
        const fieldType = fieldAny.type || fieldAny.data_type || '';

        // Skip validation if value is empty and not required
        if ((value === '' || value === null || value === undefined) && !field.required) {
          return;
        }

        // Required field validation
        if (field.required && (value === '' || value === null || value === undefined)) {
          newErrors.push({
            rowIndex: displayRowIndex,
            columnIndex: colIdx,
            message: `${field.name} is required`
          });
          return;
        }

        // Number validation
        if ((fieldType === 'number' || fieldType === 'numeric') && value !== '' && isNaN(Number(value))) {
          newErrors.push({
            rowIndex: displayRowIndex,
            columnIndex: colIdx,
            message: `${field.name} must be a number`
          });
        }

        // Boolean validation with template support
        if ((fieldType === 'boolean' || fieldType === 'bool') && value !== '') {
          const template = fieldAny.template || 'true/false';
          let isValid = false;

          if (template === 'true/false') {
            isValid = ['true', 'false', true, false].includes(value);
          } else if (template === 'yes/no') {
            isValid = ['yes', 'no', 'Yes', 'No', 'YES', 'NO'].includes(value);
          } else if (template === '1/0') {
            isValid = ['1', '0', 1, 0].includes(value);
          }

          if (!isValid) {
            newErrors.push({
              rowIndex: displayRowIndex,
              columnIndex: colIdx,
              message: `${field.name} must be a valid boolean value (${template})`
            });
          }
        }

        // Date validation
        if ((fieldType === 'date' || fieldType === 'datetime') && value !== '') {
          // Robust date validation
          let isValidDate = false;

          try {
            // Test common date formats
            const dateValue = String(value).trim();

            // Reject numeric-only values (like "1234")
            const isNumeric = /^\d+$/.test(dateValue);
            if (isNumeric) {
              newErrors.push({
                rowIndex: displayRowIndex,
                columnIndex: colIdx,
                message: `${field.name} must be a valid date format (not just numbers)`
              });
              return; // Skip further validation
            }

            // Basic validation
            const date = new Date(value);
            isValidDate = !isNaN(date.getTime());

            // Additional validation for year-only inputs
            if (isValidDate) {
              const isoString = date.toISOString();
              // If input was just a year but ISO date is January 1st, it's not a valid date format
              if (/^\d{4}-01-01T00:00:00.000Z$/.test(isoString) && !/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
                isValidDate = false;
              }
            }
          } catch (e) {
            isValidDate = false;
          }

          if (!isValidDate) {
            newErrors.push({
              rowIndex: displayRowIndex,
              columnIndex: colIdx,
              message: `${field.name} must be a valid date format`
            });
          }
        }

        // Email validation
        if (fieldType === 'email' && value !== '') {
          // Regular expression for validating an Email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const isValidEmail = emailRegex.test(String(value));

          if (!isValidEmail) {
            newErrors.push({
              rowIndex: displayRowIndex,
              columnIndex: colIdx,
              message: `${field.name} must be a valid email address`
            });
          }
        }

        // Select validation
        if ((fieldType === 'select' || fieldType === 'enum') && value !== '') {
          // Get options from validation_format
          const options = fieldAny.validation_format ? fieldAny.validation_format.split(',').map((opt: string) => opt.trim()) : [];

          if (options.length > 0 && !options.map((o: string) => o.toLowerCase()).includes(String(value).toLowerCase())) {
            newErrors.push({
              rowIndex: displayRowIndex,
              columnIndex: colIdx,
              message: `${field.name} must be one of: ${options.join(', ')}`
            });
          }
        }
      });
    });

    setErrors(newErrors);
    shouldValidateRef.current = false;
  }, [dataRows, columnMapping, template, headerRowIndex]);

  // Trigger validation
  React.useEffect(() => {
    validateData();
  }, [validateData]);

  // Cell editing
  const handleCellEdit = React.useCallback((rowIdx: number, colIdx: number, value: string) => {
    setEditedValues(prev => {
      // Only update if value actually changed
      const currentValue = prev[rowIdx]?.[colIdx];
      if (currentValue === value) return prev;

      return {
        ...prev,
        [rowIdx]: {
          ...(prev[rowIdx] || {}),
          [colIdx]: value
        }
      };
    });
  }, []);

  // Row filtering
  const visibleRows = useMemo(() => {
    if (!showOnlyErrors) return dataRows;

    return dataRows.filter((_, rowIdx) => {
      const displayRowIndex = rowIdx + headerRowIndex + 1;
      return errors.some(err => err.rowIndex === displayRowIndex);
    });
  }, [dataRows, showOnlyErrors, errors, headerRowIndex]);

  // Error tracking
  const errorTracking = useMemo(() => {
    const indices = new Set<number>();
    const rowObjects = new Set<number>();

    errors.forEach(err => {
      // Convert from display row index to actual data row index
      const dataRowIdx = err.rowIndex - headerRowIndex - 1;
      if (dataRowIdx >= 0 && dataRowIdx < dataRows.length) {
        indices.add(dataRowIdx);
        rowObjects.add(dataRows[dataRowIdx]?.index || -1);
      }
    });

    return {
      indices,  // For filtering rows
      objects: Array.from(rowObjects).filter(idx => idx !== -1),  // For UI display
      count: indices.size  // For quick access to error count
    };
  }, [errors, headerRowIndex, dataRows]);

  // Form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (disableOnInvalidRows && errors.length > 0) {
      return; // Don't submit if disableOnInvalidRows is true and there are errors
    }

    // Update the data with edited values
    const updatedData = dataRows.map((row, rowIdx) => {
      // Apply edited values to this row
      const values = [...row.values];

      if (editedValues[rowIdx]) {
        Object.entries(editedValues[rowIdx]).forEach(([colIdx, value]) => {
          values[parseInt(colIdx)] = value;
        });
      }

      return { ...row, values };
    });

    // Filter out rows with errors if filterInvalidRows is enabled
    const filteredData = filterInvalidRows
      ? updatedData.filter((_, rowIdx) => !errorTracking.indices.has(rowIdx))
      : updatedData;

    // Call onSuccess with the updated data
    onSuccess({
      ...fileData,
      rows: [headerRow, ...filteredData]
    });
  };

  return (
    <div className={style.validationContainer}>
      <div className={style.header}>
        <h2>Validate Data</h2>
        <p>Review and correct any errors in your data before importing.</p>
      </div>

      <div className={style.validationContent}>

        {filterInvalidRows && errorTracking.count > 0 && (
          <Alert status="warning" variant="left-accent" mt={4} mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>Invalid Rows Will Be Filtered</AlertTitle>
              <AlertDescription>
                {`${errorTracking.count} ${errorTracking.count === 1 ? 'row' : 'rows'} with validation errors will be excluded from the import. You can fix the errors to include these rows.`}
              </AlertDescription>
            </Box>
          </Alert>
        )}

        <div className={style.toolbar}>
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={4}>
              <Flex align="center">
                <Switch
                  id="show-errors-only"
                  size="sm"
                  isChecked={showOnlyErrors}
                  onChange={(e) => setShowOnlyErrors(e.target.checked)}
                  mr={2}
                />
                <Text fontSize="sm" fontWeight="medium">Show only rows with errors</Text>
              </Flex>
              {errors.length > 0 && (
                <Text fontSize="sm" color="red.500" fontWeight="medium">
                  {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
                </Text>
              )}
            </Flex>
            <Flex gap={2}>
              <Text fontSize="xs" color="gray.500">
                {visibleRows.length} of {dataRows.length} rows
              </Text>
            </Flex>
          </Flex>
        </div>

        <div className={style.spreadsheetContainer}>
          <div className={style.spreadsheetWrapper}>
            <table className={style.spreadsheetTable}>
              <thead className={style.spreadsheetHeader}>
                <tr>
                  <th className={style.rowNumberHeader}>#</th>
                  {headers.map((header, idx) => (
                    <th key={idx} className={style.columnHeader}>
                      <div className={style.headerContent}>{header}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={style.spreadsheetBody}>
                {visibleRows.map((row, rowIdx) => {
                  const actualRowIdx = dataRows.indexOf(row);
                  const displayRowIndex = actualRowIdx + headerRowIndex + 1;
                  const rowHasError = errors.some(err => err.rowIndex === displayRowIndex);

                  return (
                    <tr key={rowIdx} className={`${style.dataRow} ${rowHasError ? style.errorRow : ''}`}>
                      <td className={style.rowNumber}>
                        <span>{displayRowIndex + 1}</span>
                      </td>
                      {includedColumns.map((colIdx, idx) => {
                        const originalValue = row.values[colIdx];
                        const editedValue = editedValues[actualRowIdx]?.[colIdx];
                        const value = editedValue !== undefined ? editedValue : originalValue;

                        const error = errors.find(
                          err => err.rowIndex === displayRowIndex && err.columnIndex === colIdx
                        );

                        return (
                          <td key={idx} className={`${style.dataCell} ${error ? style.errorCell : ''}`}>
                            <div className={style.cellContent}>
                              <input
                                type="text"
                                value={String(value || '')}
                                onChange={(e) => handleCellEdit(actualRowIdx, colIdx, e.target.value)}
                                className={style.cellInput}
                                tabIndex={0}
                              />
                              {error && (
                                <Tooltip label={error.message} placement="top" hasArrow>
                                  <span className={style.errorIndicator}>
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <circle cx="8" cy="8" r="7" fill="#DC2626"/>
                                      <path d="M8 4.5V9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                      <circle cx="8" cy="11.5" r="0.75" fill="white"/>
                                    </svg>
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visibleRows.length === 0 && (
              <div className={style.emptyState}>
                <Text color="gray.500">
                  {showOnlyErrors ? 'No rows with errors found' : 'No data to display'}
                </Text>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Flex justify="space-between" mt={4}>
            <Button
              variant="outline"
              onClick={onCancel}
              isDisabled={isSubmitting}
              size="lg"
              px={8}
            >
              Back
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isSubmitting}
              isDisabled={disableOnInvalidRows && errors.length > 0}
              size="lg"
              px={8}
            >
              Submit
            </Button>
          </Flex>
        </form>
      </div>


    </div>
  );
}
