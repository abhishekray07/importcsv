import React from 'react';
import { Box } from '@chakra-ui/react';

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
      position="fixed"
      left={`${left}px`}
      top={`${top}px`}
      width={`${right - left}px`}
      height={`${bottom - top}px`}
      border="2px solid"
      borderColor="blue.500"
      backgroundColor="blue.50"
      opacity={0.3}
      pointerEvents="none"
      zIndex={1000}
    />
  );
};