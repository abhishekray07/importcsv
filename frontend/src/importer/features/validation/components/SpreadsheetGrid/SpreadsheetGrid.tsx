import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  RowData,
  Cell,
  Row,
} from '@tanstack/react-table';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Box, Flex, Text, HStack, VStack } from '../../../../components/ui/flex';
import { Switch } from '../../../../components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '../../../../components/ui/alert';
import { useToast } from '../../../../components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../../components/ui/dialog';
// Using native HTML table elements and custom components
// TODO: Consider adding more components from shadcn/ui
import { useHotkeys } from 'react-hotkeys-hook';
import { useImmer } from 'use-immer';
import { produce } from 'immer';
import { useTranslation } from '../../../../../i18n/useTranslation';
import { CellSelection } from './CellSelection';
import { UndoRedoManager } from './UndoRedoManager';
import { ClipboardManager } from './ClipboardManager';
import { FindReplaceModal } from './FindReplaceModal';
import './SpreadsheetGrid.scss';

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    updateBulkData: (updates: Array<{ rowIndex: number; columnId: string; value: unknown }>) => void;
  }
}

interface ValidationError {
  rowIndex: number;
  columnIndex: number;
  message: string;
}

interface SpreadsheetGridProps {
  headerRow: any;
  dataRows: any[];
  columnMapping: Record<string, any>;
  template: any;
  errors: ValidationError[];
  onCellEdit: (rowIdx: number, colIdx: number, value: string) => void;
  onBulkEdit?: (edits: Array<{ rowIdx: number; colIdx: number; value: string }>) => void;
  showOnlyErrors: boolean;
  onShowOnlyErrorsChange: (show: boolean) => void;
  filterInvalidRows?: boolean;
  headerRowIndex: number;
}

interface CellPosition {
  row: number;
  col: number;
}

interface Selection {
  start: CellPosition;
  end: CellPosition;
}

const EditableCell: React.FC<{
  getValue: () => any;
  row: any;
  column: any;
  table: any;
  hasError: boolean;
  errorMessage?: string;
  onEdit: (value: string) => void;
  isSelected: boolean;
  isInSelection: boolean;
  onCellClick: (e: React.MouseEvent) => void;
  cellRef?: React.RefObject<HTMLDivElement>;
}> = ({
  getValue,
  row,
  column,
  table,
  hasError,
  errorMessage,
  onEdit,
  isSelected,
  isInSelection,
  onCellClick,
  cellRef,
}) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (value !== initialValue) {
      onEdit(value);
    }
  }, [value, initialValue, onEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      handleBlur();
    }
  }, [initialValue, handleBlur]);

  const cellClass = useMemo(() => {
    const classes = ['spreadsheet-cell'];
    if (hasError) classes.push('cell-with-error');
    if (isSelected) classes.push('cell-selected');
    if (isInSelection) classes.push('cell-in-selection');
    return classes.join(' ');
  }, [hasError, isSelected, isInSelection]);

  if (isEditing) {
    return (
      <div className={cellClass} ref={cellRef}>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-sm h-full px-2 border-none bg-transparent focus:ring-0"
        />
      </div>
    );
  }

  return (
    <div
      ref={cellRef}
      className={cellClass}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
        onCellClick(e);
      }}
      tabIndex={0}
    >
      <Text className="text-sm select-none flex-1">
        {value || ''}
      </Text>
      {hasError && (
        <Box className="error-indicator" data-tooltip={errorMessage}>
          !
        </Box>
      )}
    </div>
  );
};

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  headerRow,
  dataRows,
  columnMapping,
  template,
  errors,
  onCellEdit,
  onBulkEdit,
  showOnlyErrors,
  onShowOnlyErrorsChange,
  filterInvalidRows,
  headerRowIndex,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [data, updateData] = useImmer(dataRows);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const undoRedoManager = useRef(new UndoRedoManager());
  const clipboardManager = useRef(new ClipboardManager());
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const includedColumns = useMemo(() => {
    return Object.entries(columnMapping)
      .filter(([_, mapping]) => mapping.include)
      .map(([index]) => parseInt(index));
  }, [columnMapping]);

  const errorMap = useMemo(() => {
    const map: Record<string, ValidationError> = {};
    errors.forEach(error => {
      const key = `${error.rowIndex}-${error.columnIndex}`;
      map[key] = error;
    });
    return map;
  }, [errors]);

  const errorRowIndices = useMemo(() => {
    const indices = new Set<number>();
    errors.forEach(err => {
      const dataRowIdx = err.rowIndex - headerRowIndex - 2;
      if (dataRowIdx >= 0 && dataRowIdx < data.length) {
        indices.add(dataRowIdx);
      }
    });
    return indices;
  }, [errors, headerRowIndex, data.length]);

  const visibleRows = useMemo(() => {
    if (!showOnlyErrors) return data;
    return data.filter((_, rowIdx) => errorRowIndices.has(rowIdx));
  }, [data, showOnlyErrors, errorRowIndices]);

  const tableData = useMemo(() => {
    return visibleRows.map((row, idx) => {
      const actualRowIndex = data.indexOf(row);
      const rowData: any = {
        _rowIndex: actualRowIndex,
        _rowNumber: actualRowIndex + headerRowIndex + 2,
      };

      includedColumns.forEach(colIdx => {
        rowData[`col_${colIdx}`] = row.values?.[colIdx] || '';
      });

      return rowData;
    });
  }, [visibleRows, data, includedColumns, headerRowIndex]);

  const handleCellEdit = useCallback((rowIdx: number, colIdx: number, value: string) => {
    const oldValue = data[rowIdx]?.values?.[colIdx] || '';

    undoRedoManager.current.addAction({
      type: 'edit',
      data: { rowIdx, colIdx, oldValue, newValue: value }
    });

    updateData(draft => {
      if (draft[rowIdx] && draft[rowIdx].values) {
        draft[rowIdx].values[colIdx] = value;
      }
    });

    onCellEdit(rowIdx, colIdx, value);
  }, [data, updateData, onCellEdit]);

  const handleBulkEdit = useCallback((edits: Array<{ rowIdx: number; colIdx: number; value: string }>) => {
    const oldValues = edits.map(edit => ({
      ...edit,
      oldValue: data[edit.rowIdx]?.values?.[edit.colIdx] || ''
    }));

    undoRedoManager.current.addAction({
      type: 'bulk-edit',
      data: oldValues
    });

    updateData(draft => {
      edits.forEach(edit => {
        if (draft[edit.rowIdx] && draft[edit.rowIdx].values) {
          draft[edit.rowIdx].values[edit.colIdx] = edit.value;
        }
      });
    });

    if (onBulkEdit) {
      onBulkEdit(edits);
    } else {
      edits.forEach(edit => onCellEdit(edit.rowIdx, edit.colIdx, edit.value));
    }
  }, [data, updateData, onCellEdit, onBulkEdit]);

  const handleCellClick = useCallback((rowIdx: number, colIdx: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedCell) {
      setSelection({
        start: selectedCell,
        end: { row: rowIdx, col: colIdx }
      });
    } else if (e.ctrlKey || e.metaKey) {
      // Add to selection
    } else {
      setSelectedCell({ row: rowIdx, col: colIdx });
      setSelection(null);
    }
  }, [selectedCell]);

  const handleCopy = useCallback(() => {
    if (selection) {
      const cells = getCellsInSelection(selection);
      const values = cells.map(cell =>
        data[cell.row]?.values?.[cell.col] || ''
      );
      clipboardManager.current.copy(values, selection);
      toast({
        title: 'Copied',
        description: `${cells.length} cells copied to clipboard`,
        status: 'success',
        duration: 2000,
      });
    } else if (selectedCell) {
      const value = data[selectedCell.row]?.values?.[selectedCell.col] || '';
      clipboardManager.current.copy([value], { start: selectedCell, end: selectedCell });
      toast({
        title: 'Copied',
        status: 'success',
        duration: 2000,
      });
    }
  }, [selection, selectedCell, data, toast]);

  const handlePaste = useCallback(async () => {
    const pasteData = await clipboardManager.current.paste();
    if (!pasteData || !selectedCell) return;

    const edits: Array<{ rowIdx: number; colIdx: number; value: string }> = [];
    const values = pasteData.split('\n').map(row => row.split('\t'));

    values.forEach((row, rowOffset) => {
      row.forEach((value, colOffset) => {
        const targetRow = selectedCell.row + rowOffset;
        const targetCol = selectedCell.col + colOffset;

        if (targetRow < data.length && includedColumns.includes(targetCol)) {
          edits.push({ rowIdx: targetRow, colIdx: targetCol, value });
        }
      });
    });

    if (edits.length > 0) {
      handleBulkEdit(edits);
      toast({
        title: 'Pasted',
        description: `${edits.length} cells updated`,
        status: 'success',
        duration: 2000,
      });
    }
  }, [selectedCell, data, includedColumns, handleBulkEdit, toast]);

  const handleUndo = useCallback(() => {
    const action = undoRedoManager.current.undo();
    if (!action) return;

    updateData(draft => {
      if (action.type === 'edit') {
        const { rowIdx, colIdx, oldValue } = action.data;
        if (draft[rowIdx] && draft[rowIdx].values) {
          draft[rowIdx].values[colIdx] = oldValue;
        }
      } else if (action.type === 'bulk-edit') {
        action.data.forEach((edit: any) => {
          if (draft[edit.rowIdx] && draft[edit.rowIdx].values) {
            draft[edit.rowIdx].values[edit.colIdx] = edit.oldValue;
          }
        });
      }
    });

    toast({
      title: 'Undo',
      status: 'info',
      duration: 1000,
    });
  }, [updateData, toast]);

  const handleRedo = useCallback(() => {
    const action = undoRedoManager.current.redo();
    if (!action) return;

    updateData(draft => {
      if (action.type === 'edit') {
        const { rowIdx, colIdx, newValue } = action.data;
        if (draft[rowIdx] && draft[rowIdx].values) {
          draft[rowIdx].values[colIdx] = newValue;
        }
      } else if (action.type === 'bulk-edit') {
        action.data.forEach((edit: any) => {
          if (draft[edit.rowIdx] && draft[edit.rowIdx].values) {
            draft[edit.rowIdx].values[edit.colIdx] = edit.value;
          }
        });
      }
    });

    toast({
      title: 'Redo',
      status: 'info',
      duration: 1000,
    });
  }, [updateData, toast]);

  const getCellsInSelection = useCallback((sel: Selection): CellPosition[] => {
    const cells: CellPosition[] = [];
    const minRow = Math.min(sel.start.row, sel.end.row);
    const maxRow = Math.max(sel.start.row, sel.end.row);
    const minCol = Math.min(sel.start.col, sel.end.col);
    const maxCol = Math.max(sel.start.col, sel.end.col);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (includedColumns.includes(col)) {
          cells.push({ row, col });
        }
      }
    }
    return cells;
  }, [includedColumns]);

  const isInSelection = useCallback((row: number, col: number): boolean => {
    if (!selection) return false;
    const minRow = Math.min(selection.start.row, selection.end.row);
    const maxRow = Math.max(selection.start.row, selection.end.row);
    const minCol = Math.min(selection.start.col, selection.end.col);
    const maxCol = Math.max(selection.start.col, selection.end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [selection]);

  // Keyboard navigation
  useHotkeys('up', () => {
    if (selectedCell && selectedCell.row > 0) {
      setSelectedCell({ ...selectedCell, row: selectedCell.row - 1 });
    }
  }, [selectedCell]);

  useHotkeys('down', () => {
    if (selectedCell && selectedCell.row < data.length - 1) {
      setSelectedCell({ ...selectedCell, row: selectedCell.row + 1 });
    }
  }, [selectedCell, data]);

  useHotkeys('left', () => {
    if (selectedCell) {
      const currentColIndex = includedColumns.indexOf(selectedCell.col);
      if (currentColIndex > 0) {
        setSelectedCell({ ...selectedCell, col: includedColumns[currentColIndex - 1] });
      }
    }
  }, [selectedCell, includedColumns]);

  useHotkeys('right', () => {
    if (selectedCell) {
      const currentColIndex = includedColumns.indexOf(selectedCell.col);
      if (currentColIndex < includedColumns.length - 1) {
        setSelectedCell({ ...selectedCell, col: includedColumns[currentColIndex + 1] });
      }
    }
  }, [selectedCell, includedColumns]);

  // Copy/Paste/Undo/Redo
  useHotkeys('cmd+c, ctrl+c', handleCopy, [handleCopy]);
  useHotkeys('cmd+v, ctrl+v', handlePaste, [handlePaste]);
  useHotkeys('cmd+z, ctrl+z', handleUndo, [handleUndo]);
  useHotkeys('cmd+shift+z, ctrl+y', handleRedo, [handleRedo]);
  useHotkeys('cmd+f, ctrl+f', () => setShowFindReplace(true), []);
  useHotkeys('escape', () => {
    setShowFindReplace(false);
    setShowContextMenu(false);
  }, []);

  const columns: ColumnDef<any>[] = useMemo(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: 'rowNumber',
        header: '#',
        accessorKey: '_rowNumber',
        size: 50,
        cell: ({ getValue }) => (
          <Text className="text-xs font-medium text-gray-600 text-center w-full">
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
          const cellKey = `${rowIdx}-${colIdx}`;

          return (
            <EditableCell
              getValue={getValue}
              row={row}
              column={column}
              table={table}
              hasError={!!error}
              errorMessage={error?.message}
              onEdit={(value) => handleCellEdit(rowIdx, colIdx, value)}
              isSelected={selectedCell?.row === rowIdx && selectedCell?.col === colIdx}
              isInSelection={isInSelection(rowIdx, colIdx)}
              onCellClick={(e) => handleCellClick(rowIdx, colIdx, e)}
              cellRef={cellRefs.current.has(cellKey) ? { current: cellRefs.current.get(cellKey)! } : undefined}
            />
          );
        },
      });
    });

    return cols;
  }, [headerRow, includedColumns, errorMap, headerRowIndex, selectedCell, selection, isDragging, handleCellEdit, handleCellClick, isInSelection]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        const colIdx = parseInt(columnId.replace('col_', ''));
        handleCellEdit(rowIndex, colIdx, String(value));
      },
      updateBulkData: (updates) => {
        const edits = updates.map(update => ({
          rowIdx: update.rowIndex,
          colIdx: parseInt(update.columnId.replace('col_', '')),
          value: String(update.value),
        }));
        handleBulkEdit(edits);
      },
    },
  });

  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="spreadsheet-grid-container">
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
          <div></div>
        </Flex>
      </div>

      {filterInvalidRows && errorRowIndices.size > 0 && (
        <Alert className="mb-4 border-l-4 border-orange-500 bg-orange-50">
          <Box>
            <AlertTitle>{t('validation.invalidRowsWarning', 'Invalid Rows Will Be Filtered')}</AlertTitle>
            <AlertDescription>
              {t('validation.invalidRowsDescription',
                `${errorRowIndices.size} ${errorRowIndices.size === 1 ? 'row' : 'rows'} with validation errors will be excluded from the import.`
              )}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      <div
        ref={parentRef}
        className="spreadsheet-table-wrapper"
      >
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
          <Box className="p-8 text-center">
            <Text>No data to display.</Text>
          </Box>
        )}
      </div>

      {showFindReplace && (
        <FindReplaceModal
          isOpen={showFindReplace}
          onClose={() => setShowFindReplace(false)}
          data={data}
          includedColumns={includedColumns}
          onReplace={handleBulkEdit}
        />
      )}
    </div>
  );
};