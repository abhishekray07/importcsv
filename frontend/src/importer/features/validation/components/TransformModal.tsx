import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Box,
  Checkbox,
  Alert,
  AlertIcon,
  Spinner,
  Badge,
  IconButton,
  Divider,
  Flex,
  useToast,
} from '@chakra-ui/react';
import { PiSparkle, PiX, PiCheck } from 'react-icons/pi';
import { useTranslation } from '../../../../i18n/useTranslation';
import {
  generateTransformations,
  countSelectedChanges,
  toggleChangeSelection,
  setAllChangesSelection,
  TransformationChange,
  COMMON_PROMPTS
} from '../../../services/transformation';

interface TransformModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  columnMapping: Record<string, any>;
  backendUrl: string;
  importerKey: string;
  validationErrors?: Array<{
    rowIndex: number;
    columnKey: string;
    message: string;
    value?: any;
  }>;
  onApplyTransformations: (changes: TransformationChange[]) => void;
}

export default function TransformModal({
  isOpen,
  onClose,
  data,
  columnMapping,
  backendUrl,
  importerKey,
  validationErrors,
  onApplyTransformations
}: TransformModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const promptInputRef = useRef<HTMLInputElement>(null);

  // State
  const [prompt, setPrompt] = useState('');
  const [changes, setChanges] = useState<TransformationChange[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // Generate transformations
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please describe the transformation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setChanges([]);
    setSummary('');

    try {
      const result = await generateTransformations(
        prompt,
        data,
        columnMapping,
        backendUrl,
        importerKey,
        undefined, // targetColumns
        validationErrors
      );

      if (result.success && result.changes.length > 0) {
        setChanges(result.changes);
        setSummary(result.summary);
      } else if (result.error) {
        setError(result.error);
      } else {
        setError('No transformations generated. Try a different description.');
      }
    } catch (err) {
      setError('Failed to generate transformations');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, data, columnMapping, backendUrl, importerKey]);

  // Apply transformations
  const handleApply = useCallback((applyAll: boolean) => {
    const selectedChanges = applyAll 
      ? setAllChangesSelection(changes, true)
      : changes.filter(c => c.selected);
    
    // Pass the selected changes directly to the parent
    onApplyTransformations(selectedChanges);
    
    toast({
      title: 'Transformations applied',
      description: `${selectedChanges.length} changes applied successfully`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    
    onClose();
  }, [changes, onApplyTransformations, onClose, toast]);

  // Toggle change selection
  const handleToggleChange = useCallback((index: number) => {
    setChanges(prev => toggleChangeSelection(prev, index));
  }, []);

  // Select all/none
  const handleSelectAll = useCallback((selected: boolean) => {
    setChanges(prev => setAllChangesSelection(prev, selected));
  }, []);

  // Use example prompt
  const handleUseExample = useCallback((examplePrompt: string) => {
    setPrompt(examplePrompt);
    setShowExamples(false);
    promptInputRef.current?.focus();
  }, []);

  // Reset modal
  const handleClose = useCallback(() => {
    setPrompt('');
    setChanges([]);
    setSummary('');
    setError(null);
    setShowExamples(false);
    onClose();
  }, [onClose]);

  const selectedCount = countSelectedChanges(changes);
  const hasChanges = changes.length > 0;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size="xl"
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>
          <HStack>
            <PiSparkle />
            <Text>{t('Transform data with AI')}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Show validation error context if available */}
            {validationErrors && validationErrors.length > 0 && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  {validationErrors.length} validation error{validationErrors.length > 1 ? 's' : ''} detected. 
                  Mention "fix errors" to focus on these rows.
                </Text>
              </Alert>
            )}
            
            {/* Prompt Input */}
            <Box>
              <HStack spacing={2} mb={2}>
                <Input
                  ref={promptInputRef}
                  placeholder={t("Describe the transformation (e.g., 'Convert dates to MM/DD/YYYY')")}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                  isDisabled={isGenerating}
                  size="lg"
                />
                <Button
                  colorScheme="blue"
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  loadingText={t('Generating')}
                  leftIcon={<PiSparkle />}
                >
                  {t('Generate')}
                </Button>
              </HStack>
              
              {/* Example prompts */}
              <Button
                size="xs"
                variant="link"
                onClick={() => setShowExamples(!showExamples)}
              >
                {showExamples ? t('Hide examples') : t('Show examples')}
              </Button>
              
              {showExamples && (
                <Box mt={2} p={2} bg="gray.50" borderRadius="md">
                  <Text fontSize="xs" mb={1} fontWeight="bold">
                    {t('Click to use:')}
                  </Text>
                  <Flex flexWrap="wrap" gap={1}>
                    {COMMON_PROMPTS.slice(0, 5).map((example, i) => (
                      <Badge
                        key={i}
                        cursor="pointer"
                        onClick={() => handleUseExample(example)}
                        _hover={{ bg: 'blue.100' }}
                      >
                        {example}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {/* Loading State */}
            {isGenerating && (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" color="blue.500" />
                <Text mt={2} color="gray.600">
                  {t('Analyzing data and generating transformations...')}
                </Text>
              </Box>
            )}

            {/* Changes Preview */}
            {hasChanges && !isGenerating && (
              <>
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="bold">
                      {summary || `${changes.length} transformations`}
                    </Text>
                    <HStack>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleSelectAll(true)}
                      >
                        {t('Select all')}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleSelectAll(false)}
                      >
                        {t('Deselect all')}
                      </Button>
                    </HStack>
                  </HStack>
                  
                  <Box
                    maxH="300px"
                    overflowY="auto"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    p={2}
                  >
                    <VStack spacing={1} align="stretch">
                      {changes.slice(0, 100).map((change, index) => (
                        <HStack
                          key={index}
                          p={2}
                          bg={change.selected ? 'blue.50' : 'white'}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={change.selected ? 'blue.200' : 'gray.100'}
                          cursor="pointer"
                          onClick={() => handleToggleChange(index)}
                          _hover={{ bg: change.selected ? 'blue.100' : 'gray.50' }}
                        >
                          <Checkbox
                            isChecked={change.selected}
                            onChange={() => handleToggleChange(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <VStack align="start" flex={1} spacing={0}>
                            <HStack fontSize="sm" color="gray.900">
                              <Text as="span" textDecoration="line-through">
                                {String(change.oldValue || 'empty')}
                              </Text>
                              <Text as="span">→</Text>
                              <Text as="span" color="green.600" fontWeight="bold">
                                {String(change.newValue)}
                              </Text>
                            </HStack>
                            <Text fontSize="xs" color="gray.600">
                              Row {change.rowIndex + 1}, {change.columnKey}
                            </Text>
                          </VStack>
                        </HStack>
                      ))}
                      
                      {changes.length > 100 && (
                        <Text fontSize="sm" color="gray.500" textAlign="center">
                          {t(`Showing first 100 of ${changes.length} changes`)}
                        </Text>
                      )}
                    </VStack>
                  </Box>
                  
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {selectedCount} {t('selected')}
                  </Text>
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="outline" onClick={handleClose}>
              {t('Cancel')}
            </Button>
            
            {hasChanges && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleApply(false)}
                  isDisabled={selectedCount === 0}
                >
                  {t(`Apply ${selectedCount} selected`)}
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => handleApply(true)}
                  leftIcon={<PiCheck />}
                >
                  {t('Apply all')}
                </Button>
              </>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}