import React, { useState, useCallback } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { HStack, VStack, Text } from '../../../../components/ui/flex';
import { useToast } from '../../../../components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '../../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
// Form components not needed in this component

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  includedColumns: number[];
  onReplace: (edits: Array<{ rowIdx: number; colIdx: number; value: string }>) => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  data,
  includedColumns,
  onReplace,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const { toast } = useToast();

  const findMatches = useCallback(() => {
    if (!findText) {
      setMatchCount(0);
      return [];
    }

    const matches: Array<{ rowIdx: number; colIdx: number }> = [];
    const searchColumns = selectedColumn !== null ? [selectedColumn] : includedColumns;

    let searchPattern: RegExp | string;
    if (useRegex) {
      try {
        searchPattern = new RegExp(findText, caseSensitive ? 'g' : 'gi');
      } catch (e) {
        toast({
          title: 'Invalid regex',
          variant: 'destructive',
        });
        return [];
      }
    } else {
      searchPattern = caseSensitive ? findText : findText.toLowerCase();
    }

    data.forEach((row, rowIdx) => {
      searchColumns.forEach(colIdx => {
        const cellValue = row.values?.[colIdx] || '';
        const searchValue = caseSensitive ? cellValue : cellValue.toLowerCase();

        let isMatch = false;
        if (useRegex && searchPattern instanceof RegExp) {
          isMatch = searchPattern.test(cellValue);
        } else if (wholeWord) {
          const wordBoundary = new RegExp(`\\b${escapeRegex(String(searchPattern))}\\b`, caseSensitive ? '' : 'i');
          isMatch = wordBoundary.test(cellValue);
        } else {
          isMatch = searchValue.includes(String(searchPattern));
        }

        if (isMatch) {
          matches.push({ rowIdx, colIdx });
        }
      });
    });

    setMatchCount(matches.length);
    return matches;
  }, [findText, caseSensitive, wholeWord, useRegex, selectedColumn, data, includedColumns, toast]);

  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleReplace = useCallback(() => {
    const matches = findMatches();
    if (matches.length === 0) {
      toast({
        title: 'No matches found',
      });
      return;
    }

    const edits: Array<{ rowIdx: number; colIdx: number; value: string }> = [];

    matches.forEach(({ rowIdx, colIdx }) => {
      const originalValue = data[rowIdx].values?.[colIdx] || '';
      let newValue: string;

      if (useRegex) {
        try {
          const regex = new RegExp(findText, caseSensitive ? 'g' : 'gi');
          newValue = originalValue.replace(regex, replaceText);
        } catch (e) {
          return;
        }
      } else if (wholeWord) {
        const wordBoundary = new RegExp(`\\b${escapeRegex(findText)}\\b`, caseSensitive ? 'g' : 'gi');
        newValue = originalValue.replace(wordBoundary, replaceText);
      } else {
        if (caseSensitive) {
          newValue = originalValue.split(findText).join(replaceText);
        } else {
          const regex = new RegExp(escapeRegex(findText), 'gi');
          newValue = originalValue.replace(regex, replaceText);
        }
      }

      if (newValue !== originalValue) {
        edits.push({ rowIdx, colIdx, value: newValue });
      }
    });

    if (edits.length > 0) {
      onReplace(edits);
      toast({
        title: 'Replace completed',
        description: `${edits.length} cells updated`,
      });
      onClose();
    }
  }, [findMatches, findText, replaceText, caseSensitive, wholeWord, useRegex, data, onReplace, toast, onClose]);

  const handleFind = useCallback(() => {
    const matches = findMatches();
    if (matches.length === 0) {
      toast({
        title: 'No matches found',
      });
    } else {
      toast({
        title: `${matches.length} matches found`,
      });
    }
  }, [findMatches, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find & Replace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <VStack className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Find</label>
              <Input
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Enter text to find"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Replace with</label>
              <Input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Enter replacement text"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search in column</label>
              <Select value={selectedColumn?.toString() ?? ''} onValueChange={(value) => setSelectedColumn(value ? parseInt(value) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="All columns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All columns</SelectItem>
                  {includedColumns.map(colIdx => (
                    <SelectItem key={colIdx} value={colIdx.toString()}>
                      Column {colIdx + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-start w-full space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Case sensitive</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={wholeWord}
                  onChange={(e) => setWholeWord(e.target.checked)}
                  disabled={useRegex}
                  className="rounded"
                />
                <span className="text-sm">Match whole word</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useRegex}
                  onChange={(e) => setUseRegex(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Use regular expressions</span>
              </label>
            </div>

            {matchCount > 0 && (
              <Text className="text-sm text-gray-600">
                {matchCount} match{matchCount !== 1 ? 'es' : ''} found
              </Text>
            )}
          </VStack>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleFind}>
            Find
          </Button>
          <Button onClick={handleReplace}>
            Replace All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};