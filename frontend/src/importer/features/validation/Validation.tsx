import React, { useState, useMemo, FormEvent, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';
import { Tooltip } from '../../components/ui/tooltip';
import { Wrench, AlertTriangle } from 'lucide-react';
import { ValidationProps } from './types';
import TransformModal from './components/TransformModal';
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
  importerKey,
  filterInvalidRows,
  disableOnInvalidRows,
}: ValidationProps) {
  // State management
  const [errors, setErrors] = useState<Array<{rowIndex: number, columnIndex: number, message: string}>>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'error'>('all');
  const [isTransformModalOpen, setIsTransformModalOpen] = useState(false);

  // Ref for scrollable section to reset scroll position
  const scrollableSectionRef = useRef<HTMLDivElement>(null);

  // Data extraction
  const headerRowIndex = selectedHeaderRow || 0;
  const headerRow = fileData.rows[headerRowIndex];

  // Make dataRows a state variable so changes persist
  const [dataRows, setDataRows] = useState(() => fileData.rows.slice(headerRowIndex + 1));

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

  // Reset scroll position when component mounts
  useEffect(() => {
    if (scrollableSectionRef.current) {
      scrollableSectionRef.current.scrollTop = 0;
    }
  }, []); // Empty dependency array ensures this runs only on mount

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

        // Get the value directly from the row
        const value = row.values[colIdx];

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

  // Trigger validation when data changes
  React.useEffect(() => {
    shouldValidateRef.current = true;
    validateData();
  }, [dataRows, validateData]);

  // Cell editing
  const handleCellEdit = React.useCallback((rowIdx: number, colIdx: number, value: string) => {
    // Only update if value actually changed
    if (dataRows[rowIdx]?.values[colIdx] === value) return;

    // Create a copy of dataRows and update the specific value
    setDataRows(prevRows => {
      const updatedRows = [...prevRows];
      if (updatedRows[rowIdx] && updatedRows[rowIdx].values) {
        // Deep copy the specific row to avoid mutation
        updatedRows[rowIdx] = {
          ...updatedRows[rowIdx],
          values: [...updatedRows[rowIdx].values]
        };
        updatedRows[rowIdx].values[colIdx] = value;
      }
      // Reset validation flag to trigger revalidation
      shouldValidateRef.current = true;
      return updatedRows;
    });

    shouldValidateRef.current = true;
  }, [dataRows]);

  // Row filtering with counts
  const { visibleRows, validCount, errorCount } = useMemo(() => {
    const errorRowIndices = new Set(
      errors.map(err => err.rowIndex - headerRowIndex - 1)
    );

    const validRows = dataRows.filter((_, idx) => !errorRowIndices.has(idx));
    const errorRows = dataRows.filter((_, idx) => errorRowIndices.has(idx));

    let filtered: typeof dataRows;
    if (filterMode === 'valid') {
      filtered = validRows;
    } else if (filterMode === 'error') {
      filtered = errorRows;
    } else {
      filtered = dataRows;
    }

    return {
      visibleRows: filtered,
      validCount: validRows.length,
      errorCount: errorRows.length
    };
  }, [dataRows, filterMode, errors, headerRowIndex]);

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

    // Filter out rows with errors if filterInvalidRows is enabled
    const filteredData = filterInvalidRows
      ? dataRows.filter((_, rowIdx) => !errorTracking.indices.has(rowIdx))
      : dataRows;

    // Call onSuccess with the updated data
    onSuccess({
      ...fileData,
      rows: [headerRow, ...filteredData]
    });
  };

  return (
    <form onSubmit={handleSubmit} className={style.validationContainer}>
      <div className={style.header}>
        <h2>Validate Data</h2>
        <p>Review and correct any errors in your data before importing.</p>
      </div>

      <div className={style.toolbarSection}>
        {filterInvalidRows && errorTracking.count > 0 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Invalid Rows Will Be Filtered</AlertTitle>
            <AlertDescription>
              {`${errorTracking.count} ${errorTracking.count === 1 ? 'row' : 'rows'} with validation errors will be excluded from the import. You can fix the errors to include these rows.`}
            </AlertDescription>
          </Alert>
        )}

        <div className={style.toolbar}>
          <div className="flex justify-between items-center">
            <div className={style.tabFilter}>
              <button
                type="button"
                className={`${style.tab} ${filterMode === 'all' ? style.active : ''}`}
                onClick={() => setFilterMode('all')}
              >
                All <span className={style.count}>{dataRows.length}</span>
              </button>
              <button
                type="button"
                className={`${style.tab} ${filterMode === 'valid' ? style.active : ''}`}
                onClick={() => setFilterMode('valid')}
              >
                Valid <span className={style.count}>{validCount}</span>
              </button>
              <button
                type="button"
                className={`${style.tab} ${style.errorTab} ${filterMode === 'error' ? style.active : ''}`}
                onClick={() => setFilterMode('error')}
              >
                Error <span className={style.count}>{errorCount}</span>
              </button>
            </div>
            <div className={style.toolbarActions}>
              {backendUrl && importerKey && errorCount > 0 && (
                <Tooltip content="Use AI to automatically fix validation errors">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsTransformModalOpen(true)}
                    variant="default"
                    className="shadow-sm"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Fix errors
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={style.scrollableSection} ref={scrollableSectionRef}>
            <div className={style.tableWidth}>
            <table className="border-collapse" style={{ minWidth: '100%' }}>
              <thead className="bg-gray-50 border-b-2 border-gray-200" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50 border-r border-gray-200" style={{ position: 'sticky', left: 0, zIndex: 11, minWidth: '60px', width: '60px' }}>#</th>
                  {headers.map((header, idx) => (
                    <th key={idx} className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50" style={{ minWidth: '150px' }}>
                      <div>{header}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                  {visibleRows.map((row, rowIdx) => {
                    const actualRowIdx = dataRows.indexOf(row);
                    const displayRowIndex = actualRowIdx + headerRowIndex + 1;
                    const rowHasError = errors.some(err => err.rowIndex === displayRowIndex);

                    return (
                      <tr key={rowIdx} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${rowHasError ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                        <td className="px-6 py-3 text-sm text-gray-700 border-r border-gray-200" style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: rowHasError ? '#FEF2F2' : '#F9FAFB', minWidth: '60px', width: '60px' }}>
                          <span>{displayRowIndex + 1}</span>
                        </td>
                        {includedColumns.map((colIdx, idx) => {
                          const value = row.values[colIdx];

                          const error = errors.find(
                            err => err.rowIndex === displayRowIndex && err.columnIndex === colIdx
                          );

                          return (
                            <td key={idx} className="px-6 py-3" style={{ minWidth: '150px' }}>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={String(value || '')}
                                  onChange={(e) => handleCellEdit(actualRowIdx, colIdx, e.target.value)}
                                  tabIndex={0}
                                  className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                                />
                                {error && (
                                  <Tooltip content={error.message}>
                                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2">
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
            </div>
            {visibleRows.length === 0 && (
              <div className="p-8 text-center">
                <span className="text-gray-500">
                  {filterMode === 'error' ? 'No rows with errors found' :
                   filterMode === 'valid' ? 'No valid rows found' :
                   'No data to display'}
                </span>
              </div>
            )}
      </div>

      <div className={style.footerSection}>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          size="default"
        >
          Back
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={disableOnInvalidRows && errors.length > 0}
          size="default"
          variant="default"
        >
          Submit
        </Button>
      </div>

      {/* Transform Modal */}
      {backendUrl && importerKey && (
        <TransformModal
          isOpen={isTransformModalOpen}
          onClose={() => setIsTransformModalOpen(false)}
          data={dataRows}
          columnMapping={columnMapping}
          backendUrl={backendUrl}
          importerKey={importerKey}
          validationErrors={errors.map(e => {
            // Convert display row index to data array index
            const dataRowIndex = e.rowIndex - headerRowIndex - 1;
            return {
              rowIndex: dataRowIndex,
              columnKey: columnMapping[e.columnIndex]?.key || '',
              message: e.message,
              value: dataRows[dataRowIndex]?.values[e.columnIndex]
            };
          })}
          onApplyTransformations={(changes) => {
            console.log('=== APPLYING TRANSFORMATIONS ===');
            console.log('Total changes received:', changes.length);
            console.log('Current dataRows length:', dataRows.length);

            // Create a copy of dataRows and apply all changes
            const updatedRows = [...dataRows];
            let appliedCount = 0;
            let skippedCount = 0;

            changes.forEach((change) => {
              const { rowIndex, columnIndex, newValue } = change;

              // Skip if columnIndex is undefined
              if (columnIndex === undefined) {
                console.warn(`Skipping change for row ${rowIndex}: columnIndex is undefined`);
                skippedCount++;
                return;
              }

              // Validate row index
              if (rowIndex < 0 || rowIndex >= updatedRows.length) {
                console.warn(`Skipping change: rowIndex ${rowIndex} out of bounds (dataRows has ${updatedRows.length} rows)`);
                skippedCount++;
                return;
              }

              // Apply the change
              if (updatedRows[rowIndex] && updatedRows[rowIndex].values) {
                // Deep copy the row to avoid mutation issues
                if (updatedRows[rowIndex] === dataRows[rowIndex]) {
                  updatedRows[rowIndex] = {
                    ...updatedRows[rowIndex],
                    values: [...updatedRows[rowIndex].values]
                  };
                }
                updatedRows[rowIndex].values[columnIndex] = newValue;
                appliedCount++;
                console.log(`Applied change to row ${rowIndex}, column ${columnIndex}: ${newValue}`);
              }
            });

            console.log(`=== TRANSFORMATION SUMMARY ===`);
            console.log(`Applied: ${appliedCount} changes`);
            console.log(`Skipped: ${skippedCount} changes`);

            // Update the state with all changes at once
            setDataRows(updatedRows);
            shouldValidateRef.current = true;
            setIsTransformModalOpen(false);
          }}
        />
      )}
    </form>
  );
}
