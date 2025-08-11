import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  Switch,
  Select,
  Button,
  Badge,
  Icon,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import { PiCheckCircle } from 'react-icons/pi';
import { useTranslation } from '../../../i18n/useTranslation';
import { Template } from '../../types';
import stringSimilarity from '../../utils/stringSimilarity';
import style from './style/ConfigureImport.module.scss';

interface ConfigureImportProps {
  template: Template;
  data: any;
  onSuccess: (mapping: any, headerRow: number) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface ColumnMapping {
  [uploadColumnIndex: number]: {
    key: string;
    name: string;
    include: boolean;
  };
}

export default function ConfigureImport({
  template,
  data,
  onSuccess,
  onCancel,
  isSubmitting = false,
}: ConfigureImportProps) {
  const { t } = useTranslation();
  const selectedHeaderRow = 0; // Always use first row as headers
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState<string | null>(null);

  // Get preview data (first 5 rows)
  const previewRows = useMemo(() => {
    return data.rows.slice(0, Math.min(5, data.rows.length));
  }, [data.rows]);

  // Get column headers from first row
  const columnHeaders = useMemo(() => {
    if (data.rows[selectedHeaderRow]) {
      return data.rows[selectedHeaderRow].values;
    }
    return [];
  }, [data.rows]);

  // Get sample data for each column (skip header row)
  const getSampleData = (columnIndex: number) => {
    const startRow = selectedHeaderRow + 1;
    const samples = data.rows
      .slice(startRow, startRow + 3)
      .map((row: any) => row.values[columnIndex])
      .filter((val: any) => val);
    return samples.join(', ');
  };

  // Auto-map columns based on name similarity
  useEffect(() => {
    const autoMap: ColumnMapping = {};
    
    columnHeaders.forEach((header: string, index: number) => {
      let bestMatch = { column: null as any, score: 0 };
      
      template.columns.forEach((templateCol) => {
        const score = stringSimilarity(
          header.toLowerCase().trim(),
          templateCol.name.toLowerCase().trim()
        );
        
        if (score > bestMatch.score && score > 0.6) {
          bestMatch = { column: templateCol, score };
        }
      });
      
      if (bestMatch.column) {
        autoMap[index] = {
          key: bestMatch.column.key,
          name: bestMatch.column.name,
          include: true,
        };
      }
    });
    
    setColumnMapping(autoMap);
  }, [columnHeaders, template.columns]);

  // Handle column mapping change
  const handleMappingChange = (templateFieldKey: string, csvColumnIndex: string) => {
    const newMapping = { ...columnMapping };
    
    // Clear previous mapping for this template field
    Object.keys(newMapping).forEach((key) => {
      if (newMapping[parseInt(key)].key === templateFieldKey) {
        delete newMapping[parseInt(key)];
      }
    });
    
    // Set new mapping if column selected
    if (csvColumnIndex !== '') {
      const colIndex = parseInt(csvColumnIndex);
      const templateField = template.columns.find(col => col.key === templateFieldKey);
      
      if (templateField) {
        newMapping[colIndex] = {
          key: templateFieldKey,
          name: templateField.name,
          include: true,
        };
      }
    }
    
    setColumnMapping(newMapping);
  };

  // Get CSV column index for a template field
  const getMappedColumn = (templateFieldKey: string): string => {
    const entry = Object.entries(columnMapping).find(
      ([_, mapping]) => mapping.key === templateFieldKey
    );
    return entry ? entry[0] : '';
  };

  // Check if all required fields are mapped
  const allRequiredFieldsMapped = useMemo(() => {
    const requiredFields = template.columns.filter((col: any) => col.required);
    return requiredFields.every((field: any) => 
      Object.values(columnMapping).some(mapping => mapping.key === field.key)
    );
  }, [template.columns, columnMapping]);

  // Handle form submission
  const handleSubmit = () => {
    if (!allRequiredFieldsMapped) {
      setError(t('Please map all required fields'));
      return;
    }
    
    setError(null);
    onSuccess(columnMapping, selectedHeaderRow);
  };

  return (
    <div className={style.configureImport}>
      <VStack align="stretch" spacing={6}>
        {/* Title Section */}
        <Box>
          <Text fontSize="2xl" fontWeight="600" mb={2}>
            {t('CSV fields mapping')}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {t('Map columns from imported CSV to the default fields required for the payment. Not required columns could be skipped')}
          </Text>
        </Box>

        {/* Mapping Table */}
        <Box 
          border="1px solid" 
          borderColor="gray.200" 
          borderRadius="lg"
          overflow="hidden"
          bg="white"
        >
          <Table variant="simple" size="md">
            <Thead bg="gray.50">
              <Tr>
                <Th width="35%" py={4}>
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                      {t('Payment Fields')}
                    </Text>
                  </HStack>
                </Th>
                <Th width="30%" py={4}>
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                      {t('CSV Column')}
                    </Text>
                  </HStack>
                </Th>
                <Th width="35%" py={4}>
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                      {t('CSV Example Data')}
                    </Text>
                  </HStack>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {template.columns.map((field: any, index: number) => {
                const mappedColumn = getMappedColumn(field.key);
                const isMapped = mappedColumn !== '';
                
                return (
                  <Tr key={field.key}>
                    <Td py={4}>
                      <HStack spacing={2}>
                        {isMapped && (
                          <Icon as={PiCheckCircle} color="green.500" boxSize={5} />
                        )}
                        {!isMapped && field.required && (
                          <Box 
                            width={5} 
                            height={5} 
                            borderRadius="full" 
                            border="2px solid" 
                            borderColor="gray.300"
                          />
                        )}
                        {!isMapped && !field.required && (
                          <Box width={5} height={5} />
                        )}
                        <Text fontSize="sm" fontWeight="500">
                          {field.name}
                          {field.required && (
                            <Text as="span" color="red.500">*</Text>
                          )}
                        </Text>
                      </HStack>
                    </Td>
                    <Td py={4}>
                      <Select
                        size="sm"
                        value={mappedColumn}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        placeholder={t('Select column')}
                        borderColor="gray.300"
                        _hover={{ borderColor: 'gray.400' }}
                        bg="white"
                      >
                        {columnHeaders.map((header: string, idx: number) => {
                          const isAlreadyMapped = Object.keys(columnMapping).includes(idx.toString()) &&
                            columnMapping[idx].key !== field.key;
                          
                          return (
                            <option 
                              key={idx} 
                              value={idx}
                              disabled={isAlreadyMapped}
                            >
                              {header}
                            </option>
                          );
                        })}
                      </Select>
                    </Td>
                    <Td py={4}>
                      <Text fontSize="sm" color="gray.600" noOfLines={1}>
                        {mappedColumn ? (getSampleData(parseInt(mappedColumn)) || '-') : ''}
                      </Text>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>

        {/* Action Buttons */}
        <Flex justify="space-between">
          <Button
            variant="outline"
            onClick={onCancel}
            isDisabled={isSubmitting}
            size="lg"
            px={8}
          >
            {t('Back')}
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={!allRequiredFieldsMapped}
            size="lg"
            px={8}
          >
            {t('Continue')}
          </Button>
        </Flex>
      </VStack>
    </div>
  );
}