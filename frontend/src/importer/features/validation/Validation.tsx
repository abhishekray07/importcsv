import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Flex, Text, Box, Switch, Tooltip, Input, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
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
  const { t } = useTranslation();

  
  // Basic state setup
  const [editedValues, setEditedValues] = useState<Record<number, Record<number, any>>>({});
  const [errors, setErrors] = useState<Array<{rowIndex: number, columnIndex: number, message: string}>>([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  
  // Extract header and data rows
  const headerRowIndex = selectedHeaderRow || 0;
  const headerRow = fileData.rows[headerRowIndex];
  const dataRows = fileData.rows.slice(headerRowIndex + 1);
  
  // Get included columns from mapping
  const includedColumns = useMemo(() => {
    return Object.entries(columnMapping)
      .filter(([_, mapping]) => mapping.include)
      .map(([index]) => parseInt(index));
  }, [columnMapping]);
  
  // Get column headers
  const headers = useMemo(() => {
    return includedColumns.map(colIdx => String(headerRow.values[colIdx]));
  }, [includedColumns, headerRow]);
  
  // Validate data - use a ref to track if we need to validate
  const shouldValidateRef = React.useRef(true);
  
  // Create a stable version of editedValues for dependency tracking
  const editedValuesRef = React.useRef(editedValues);
  React.useEffect(() => {
    editedValuesRef.current = editedValues;
    shouldValidateRef.current = true;
  }, [editedValues]);
  
  // Check for mapping mismatches
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

  // Separate validation logic
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
  
  // Run validation when needed
  React.useEffect(() => {
    validateData();
  }, [validateData]);
  
  // Handle cell edit with debouncing to prevent too many updates
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
  
  // Filter rows if showing only errors
  const visibleRows = useMemo(() => {
    if (!showOnlyErrors) return dataRows;
    
    return dataRows.filter((_, rowIdx) => {
      const displayRowIndex = rowIdx + headerRowIndex + 1;
      return errors.some(err => err.rowIndex === displayRowIndex);
    });
  }, [dataRows, showOnlyErrors, errors, headerRowIndex]);
  
  // Track rows with errors - consolidated error tracking
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

  // Handle form submission
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

  // Render the component
  return (
    <div className={style.validationContainer}>
      <div className={style.header}>
        <h2>{t('validation.title', 'Validate Data')}</h2>
        <p>{t('validation.description', 'Review and correct any errors in your data before importing.')}</p>
      </div>
      
      <div className={style.validationContent}>
        {errors.length > 0 && (
          <div className={style.errorSummary}>
            <Flex justify="space-between" align="center">
              <Text color="red.500">
                {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
              </Text>
            </Flex>
          </div>
        )}
        
        {filterInvalidRows && errorTracking.count > 0 && (
          <Alert status="warning" variant="left-accent" mt={4} mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>{t('validation.invalidRowsWarning', 'Invalid Rows Will Be Filtered')}</AlertTitle>
              <AlertDescription>
                {t('validation.invalidRowsDescription', 
                  `${errorTracking.count} ${errorTracking.count === 1 ? 'row' : 'rows'} with validation errors will be excluded from the import. You can fix the errors to include these rows.`
                )}
              </AlertDescription>
            </Box>
          </Alert>
        )}
        
        <div className={style.validationFilters}>
          <Flex align="center">
            <Switch 
              id="show-errors-only" 
              isChecked={showOnlyErrors} 
              onChange={(e) => setShowOnlyErrors(e.target.checked)} 
              mr={2}
            />
            <Text fontSize="sm">Show only rows with errors</Text>
          </Flex>
        </div>
        
        <div className={style.tableContainer}>
          <table className={style.validationTable}>
            <thead>
              <tr>
                {headers.map((header, idx) => (
                  <th key={idx}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIdx) => {
                const actualRowIdx = dataRows.indexOf(row);
                const displayRowIndex = actualRowIdx + headerRowIndex + 1;
                const rowHasError = errors.some(err => err.rowIndex === displayRowIndex);
                
                return (
                  <tr key={rowIdx} className={rowHasError ? style.errorRow : ''}>
                    {includedColumns.map((colIdx, idx) => {
                      const originalValue = row.values[colIdx];
                      const editedValue = editedValues[actualRowIdx]?.[colIdx];
                      const value = editedValue !== undefined ? editedValue : originalValue;
                      
                      const error = errors.find(
                        err => err.rowIndex === displayRowIndex && err.columnIndex === colIdx
                      );
                      
                      return (
                        <td key={idx}>
                          <div className={style.editableCellContainer}>
                            <Input
                              size="sm"
                              value={String(value || '')}
                              onChange={(e) => handleCellEdit(actualRowIdx, colIdx, e.target.value)}
                              className={`${style.simpleInput} ${error ? style.errorInput : ''}`}
                            />
                            {error && (
                              <Tooltip label={error.message} placement="top">
                                <Box className={style.errorIcon}>!</Box>
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
        </div>
        
        <form onSubmit={handleSubmit}>
          <Flex justify="space-between" mt={4}>
            <Button onClick={onCancel} isDisabled={isSubmitting}>
              {t('common.back', 'Back')}
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isSubmitting}
              isDisabled={disableOnInvalidRows && errors.length > 0}
            >
              {t('common.continue', 'Continue')}
            </Button>
          </Flex>
        </form>
      </div>
      

    </div>
  );
}
