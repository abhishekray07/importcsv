import React, { useState, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Button,
  Checkbox,
  VStack,
  HStack,
  Text,
  useToast,
  Select,
} from '@chakra-ui/react';

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
  const toast = useToast();

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
          status: 'error',
          duration: 2000,
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
        status: 'warning',
        duration: 2000,
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
        status: 'success',
        duration: 3000,
      });
      onClose();
    }
  }, [findMatches, findText, replaceText, caseSensitive, wholeWord, useRegex, data, onReplace, toast, onClose]);

  const handleFind = useCallback(() => {
    const matches = findMatches();
    if (matches.length === 0) {
      toast({
        title: 'No matches found',
        status: 'info',
        duration: 2000,
      });
    } else {
      toast({
        title: `${matches.length} matches found`,
        status: 'success',
        duration: 2000,
      });
    }
  }, [findMatches, toast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Find & Replace</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Find</FormLabel>
              <Input
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Enter text to find"
                autoFocus
              />
            </FormControl>

            <FormControl>
              <FormLabel>Replace with</FormLabel>
              <Input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Enter replacement text"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Search in column</FormLabel>
              <Select
                value={selectedColumn ?? ''}
                onChange={(e) => setSelectedColumn(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">All columns</option>
                {includedColumns.map(colIdx => (
                  <option key={colIdx} value={colIdx}>
                    Column {colIdx + 1}
                  </option>
                ))}
              </Select>
            </FormControl>

            <VStack align="start" width="100%">
              <Checkbox
                isChecked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              >
                Case sensitive
              </Checkbox>
              <Checkbox
                isChecked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                isDisabled={useRegex}
              >
                Match whole word
              </Checkbox>
              <Checkbox
                isChecked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
              >
                Use regular expressions
              </Checkbox>
            </VStack>

            {matchCount > 0 && (
              <Text fontSize="sm" color="gray.600">
                {matchCount} match{matchCount !== 1 ? 'es' : ''} found
              </Text>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleFind}>
              Find
            </Button>
            <Button colorScheme="blue" onClick={handleReplace}>
              Replace All
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};