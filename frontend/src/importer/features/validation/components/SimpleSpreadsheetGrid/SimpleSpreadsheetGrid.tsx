import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  RowData,
} from '@tanstack/react-table';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Flex,
  Text,
  Switch,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
} from '@chakra-ui/react';
import { useTranslation } from '../../../../../i18n/useTranslation';
import './SimpleSpreadsheetGrid.scss';

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}

interface ValidationError {
  rowIndex: number;
  columnIndex: number;
  message: string;
}

interface SimpleSpreadsheetGridProps {
  headerRow: any;
  dataRows: any[];
  columnMapping: Record<string, any>;
  template: any;
  errors: ValidationError[];
  onCellEdit: (rowIdx: number, colIdx: number, value: string) => void;
  showOnlyErrors: boolean;
  onShowOnlyErrorsChange: (show: boolean) => void;
  filterInvalidRows?: boolean;
  headerRowIndex: number;
}

// Editable cell component
const EditableCell: React.FC<{
  getValue: () => any;
  row: any;
  column: any;
  table: any;
  hasError: boolean;
  errorMessage?: string;
  onEdit: (value: string) => void;
}> = ({ getValue, row, column, table, hasError, errorMessage, onEdit }) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  const onBlur = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      onEdit(value);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onBlur();
          }
          if (e.key === 'Escape') {
            setValue(initialValue);
            setIsEditing(false);
          }
        }}
        size="sm"
        autoFocus
        variant="unstyled"
        px={2}
      />
    );
  }

  return (
    <Flex
      onClick={() => setIsEditing(true)}
      cursor="pointer"
      px={2}
      py={1}
      className={hasError ? 'cell-with-error' : ''}
      align="center"
      justify="space-between"
      title={hasError ? errorMessage : undefined}
    >
      <Text fontSize="sm" flex="1">{value || ''}</Text>
      {hasError && (
        <Box className="error-indicator" ml={2}>!</Box>
      )}
    </Flex>
  );
};

export const SimpleSpreadsheetGrid: React.FC<SimpleSpreadsheetGridProps> = ({
  headerRow,
  dataRows,
  columnMapping,
  template,
  errors,
  onCellEdit,
  showOnlyErrors,
  onShowOnlyErrorsChange,
  filterInvalidRows,
  headerRowIndex,
}) => {
  const { t } = useTranslation();

  // Get included columns from mapping
  const includedColumns = useMemo(() => {
    return Object.entries(columnMapping)
      .filter(([_, mapping]) => mapping.include)
      .map(([index]) => parseInt(index));
  }, [columnMapping]);

  // Build error map for quick lookup
  const errorMap = useMemo(() => {
    const map: Record<string, ValidationError> = {};
    errors.forEach(error => {
      const key = `${error.rowIndex}-${error.columnIndex}`;
      map[key] = error;
    });
    return map;
  }, [errors]);

  // Track rows with errors
  const errorRowIndices = useMemo(() => {
    const indices = new Set<number>();
    errors.forEach(err => {
      const dataRowIdx = err.rowIndex - headerRowIndex - 2;
      if (dataRowIdx >= 0 && dataRowIdx < dataRows.length) {
        indices.add(dataRowIdx);
      }
    });
    return indices;
  }, [errors, headerRowIndex, dataRows.length]);

  // Filter rows if showing only errors
  const visibleRows = useMemo(() => {
    if (!showOnlyErrors) return dataRows;
    return dataRows.filter((_, rowIdx) => errorRowIndices.has(rowIdx));
  }, [dataRows, showOnlyErrors, errorRowIndices]);

  // Prepare data for the table
  const tableData = useMemo(() => {
    return visibleRows.map((row, idx) => {
      const actualRowIndex = dataRows.indexOf(row);
      const rowData: any = {
        _rowIndex: actualRowIndex,
        _rowNumber: actualRowIndex + headerRowIndex + 2,
      };
      
      includedColumns.forEach(colIdx => {
        rowData[`col_${colIdx}`] = row.values?.[colIdx] || '';
      });
      
      return rowData;
    });
  }, [visibleRows, dataRows, includedColumns, headerRowIndex]);

  // Define columns for TanStack Table
  const columns: ColumnDef<any>[] = useMemo(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: 'rowNumber',
        header: '#',
        accessorKey: '_rowNumber',
        size: 50,
        cell: ({ getValue }) => (
          <Text fontSize="sm" fontWeight="medium" color="gray.600">
            {String(getValue())}
          </Text>
        ),
      },
    ];

    includedColumns.forEach((colIdx) => {
      const header = String(headerRow.values[colIdx]);
      
      cols.push({
        id: `col_${colIdx}`,
        header,
        accessorKey: `col_${colIdx}`,
        cell: ({ getValue, row, column, table }) => {
          const rowIdx = row.original._rowIndex;
          const csvRowNumber = rowIdx + headerRowIndex + 2;
          const errorKey = `${csvRowNumber}-${colIdx}`;
          const error = errorMap[errorKey];
          
          return (
            <EditableCell
              getValue={getValue}
              row={row}
              column={column}
              table={table}
              hasError={!!error}
              errorMessage={error?.message}
              onEdit={(value) => onCellEdit(rowIdx, colIdx, value)}
            />
          );
        },
      });
    });

    return cols;
  }, [headerRow, includedColumns, errorMap, headerRowIndex, onCellEdit]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="simple-spreadsheet-grid-container">
      <div className="spreadsheet-toolbar">
        <Flex justify="space-between" align="center" mb={4}>
          <Flex align="center" gap={4}>
            <Text fontSize="sm" fontWeight="medium">
              {errors.length > 0 ? (
                <Text as="span" color="red.500">
                  {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
                </Text>
              ) : (
                <Text as="span" color="green.500">
                  No errors found
                </Text>
              )}
            </Text>
            <Flex align="center">
              <Switch
                id="show-errors-only"
                isChecked={showOnlyErrors}
                onChange={(e) => onShowOnlyErrorsChange(e.target.checked)}
                mr={2}
              />
              <Text fontSize="sm">Show only rows with errors</Text>
            </Flex>
          </Flex>
          <Flex gap={2}>
            <Button size="sm" variant="outline" isDisabled>
              Find & Replace
            </Button>
            <Button size="sm" variant="outline" isDisabled>
              Bulk Actions
            </Button>
          </Flex>
        </Flex>
      </div>

      {filterInvalidRows && errorRowIndices.size > 0 && (
        <Alert status="warning" variant="left-accent" mb={4}>
          <AlertIcon />
          <Box>
            <AlertTitle>{t('validation.invalidRowsWarning', 'Invalid Rows Will Be Filtered')}</AlertTitle>
            <AlertDescription>
              {t('validation.invalidRowsDescription',
                `${errorRowIndices.size} ${errorRowIndices.size === 1 ? 'row' : 'rows'} with validation errors will be excluded from the import. You can fix the errors to include these rows.`
              )}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      <div className="spreadsheet-table-wrapper">
        <Table variant="simple" size="sm">
          <Thead>
            {table.getHeaderGroups().map(headerGroup => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <Th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map(row => (
              <Tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <Td key={cell.id} p={0}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
        
        {tableData.length === 0 && (
          <Box p={8} textAlign="center">
            <Text>No data to display. Please check your CSV file and column mappings.</Text>
          </Box>
        )}
      </div>
    </div>
  );
};