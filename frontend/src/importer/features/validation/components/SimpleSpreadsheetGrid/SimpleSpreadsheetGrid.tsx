import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  RowData,
} from '@tanstack/react-table';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Box, Flex, Text } from '../../../../components/ui/flex';
import { Switch } from '../../../../components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '../../../../components/ui/alert';
// Using native HTML table elements for now
// TODO: Consider adding table components from shadcn/ui
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
        autoFocus
        className="text-sm px-2 border-none bg-transparent focus:ring-0"
      />
    );
  }

  return (
    <Flex
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer px-2 py-1 items-center justify-between ${hasError ? 'cell-with-error' : ''}`}
      title={hasError ? errorMessage : undefined}
    >
      <Text className="text-sm flex-1">{value || ''}</Text>
      {hasError && (
        <Box className="error-indicator ml-2">!</Box>
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
          <Text className="text-sm font-medium text-gray-600">
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
        <Flex justify="between" align="center" className="mb-4">
          <Flex align="center" className="gap-4">
            <Text className="text-sm font-medium">
              {errors.length > 0 ? (
                <Text className="text-red-500">
                  {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
                </Text>
              ) : (
                <Text className="text-green-500">
                  No errors found
                </Text>
              )}
            </Text>
            <Flex align="center">
              <Switch
                id="show-errors-only"
                checked={showOnlyErrors}
                onCheckedChange={onShowOnlyErrorsChange}
                className="mr-2"
              />
              <Text className="text-sm">Show only rows with errors</Text>
            </Flex>
          </Flex>
          <Flex className="gap-2">
            <Button size="sm" variant="outline" disabled>
              Find & Replace
            </Button>
            <Button size="sm" variant="outline" disabled>
              Bulk Actions
            </Button>
          </Flex>
        </Flex>
      </div>

      {filterInvalidRows && errorRowIndices.size > 0 && (
        <Alert className="mb-4 border-l-4 border-orange-500 bg-orange-50">
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
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-2 text-left font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {tableData.length === 0 && (
          <Box className="p-8 text-center">
            <Text>No data to display. Please check your CSV file and column mappings.</Text>
          </Box>
        )}
      </div>
    </div>
  );
};