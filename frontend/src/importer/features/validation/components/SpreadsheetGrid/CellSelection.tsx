import React from 'react';
import { Box } from '../../../../components/ui/flex';

interface CellPosition {
  row: number;
  col: number;
}

interface Selection {
  start: CellPosition;
  end: CellPosition;
}

interface CellSelectionProps {
  selection: Selection | null;
  cellRefs: Map<string, HTMLDivElement>;
}

export const CellSelection: React.FC<CellSelectionProps> = ({ selection, cellRefs }) => {
  if (!selection) return null;

  const startKey = `${selection.start.row}-${selection.start.col}`;
  const endKey = `${selection.end.row}-${selection.end.col}`;
  
  const startCell = cellRefs.get(startKey);
  const endCell = cellRefs.get(endKey);

  if (!startCell || !endCell) return null;

  const startRect = startCell.getBoundingClientRect();
  const endRect = endCell.getBoundingClientRect();

  const left = Math.min(startRect.left, endRect.left);
  const top = Math.min(startRect.top, endRect.top);
  const right = Math.max(startRect.right, endRect.right);
  const bottom = Math.max(startRect.bottom, endRect.bottom);

  return (
    <Box
      className="fixed border-2 border-blue-500 bg-blue-50 opacity-30 pointer-events-none z-[1000]"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${right - left}px`,
        height: `${bottom - top}px`,
      }}
    />
  );
};