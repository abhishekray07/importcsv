import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "../../../../i18n/useTranslation";
import Checkbox from "../../../components/Checkbox";
import { InputOption } from "../../../components/Input/types";
import DropdownFields from "../components/DropDownFields";
import { TemplateColumn, UploadColumn } from "../../../types";
import stringsSimilarity from "../../../utils/stringSimilarity";
import { TemplateColumnMapping } from "../types";
import { getMappingSuggestions } from "../../../services/mapping";
import style from "../style/MapColumns.module.scss";


export default function useMapColumnsTable(
  uploadColumns: UploadColumn[],
  templateColumns: TemplateColumn[] = [],
  columnsValues: { [uploadColumnIndex: number]: TemplateColumnMapping },
  isLoading?: boolean,
  importerKey?: string,
  backendUrl?: string
) {
  const { t } = useTranslation();

  useEffect(() => {
    Object.keys(columnsValues).map((uploadColumnIndexStr) => {
      const uploadColumnIndex = Number(uploadColumnIndexStr);
      const templateKey = columnsValues[uploadColumnIndex].key;
      handleTemplateChange(uploadColumnIndex, templateKey);
    });
  }, []);

  const checkSimilarity = (templateColumnKey: string, uploadColumnName: string) => {
    const templateColumnKeyFormatted = templateColumnKey.replace(/_/g, " ");
    return stringsSimilarity(templateColumnKeyFormatted, uploadColumnName.toLowerCase()) > 0.9;
  };

  // Simple string matching function - always returns false since suggested_mappings were removed
  const isSuggestedMapping = (templateColumn: TemplateColumn, uploadColumnName: string) => {
    return false; // No longer using suggested mappings
  };

  const [values, setValues] = useState<{ [key: number]: TemplateColumnMapping }>(() => {
    const usedTemplateColumns = new Set<string>();
    const initialObject: { [key: number]: TemplateColumnMapping } = {};

    // Create initial mappings using traditional string matching
    const initialMappings = uploadColumns.reduce((acc, uc) => {
      const matchedSuggestedTemplateColumn = templateColumns?.find((tc) => isSuggestedMapping(tc, uc.name));

      if (matchedSuggestedTemplateColumn && matchedSuggestedTemplateColumn.key) {
        usedTemplateColumns.add(matchedSuggestedTemplateColumn.key);
        acc[uc.index] = {
          key: matchedSuggestedTemplateColumn.key,
          include: true,
          selected: true
        };
        return acc;
      }

      const similarTemplateColumn = templateColumns?.find((tc) => {
        if (tc.key && !usedTemplateColumns.has(tc.key) && checkSimilarity(tc.key, uc.name)) {
          usedTemplateColumns.add(tc.key);
          return true;
        }
        return false;
      });

      acc[uc.index] = {
        key: similarTemplateColumn?.key || "",
        include: !!similarTemplateColumn?.key,
        selected: true,
      };
      return acc;
    }, initialObject);

    return initialMappings;
  });

  const [selectedValues, setSelectedValues] = useState<{ key: string; selected: boolean | undefined }[]>(
    Object.values(values).map(({ key, selected }) => ({ key, selected }))
  );

  // Track if LLM enhancement has been called to prevent multiple API calls
  const llmEnhancementCalled = useRef(false);

  // Enhance mappings with LLM suggestions after initial load
  useEffect(() => {
    const enhanceWithLLM = async () => {
      // Skip if already called
      if (llmEnhancementCalled.current) {
        return;
      }
      
      // Only run if we have columns, backend URL, and importer key
      if (!uploadColumns.length || !templateColumns.length || !backendUrl || !importerKey) {
        return;
      }

      // Mark as called to prevent duplicate requests
      llmEnhancementCalled.current = true;

      try {
        // Get LLM-enhanced mapping suggestions
        const suggestions = await getMappingSuggestions(
          uploadColumns,
          templateColumns,
          backendUrl,
          importerKey
        );

        if (suggestions.length > 0) {
          // Apply high-confidence suggestions that don't override existing good matches
          setValues((prevValues) => {
            const newValues = { ...prevValues };
            const usedTemplateKeys = new Set(
              Object.values(prevValues)
                .filter(v => v.key)
                .map(v => v.key)
            );

            // Sort by confidence (highest first)
            const sortedSuggestions = [...suggestions].sort((a, b) => b.confidence - a.confidence);

            for (const suggestion of sortedSuggestions) {
              // Only apply if:
              // 1. Good confidence (>0.7)
              // 2. No existing mapping or low-confidence string match
              // 3. Template key not already used
              const currentMapping = prevValues[suggestion.uploadIndex];
              const hasWeakMatch = currentMapping?.key && !currentMapping?.selected;
              
              if (
                suggestion.confidence > 0.7 &&
                (!currentMapping?.key || hasWeakMatch) &&
                !usedTemplateKeys.has(suggestion.templateKey)
              ) {
                newValues[suggestion.uploadIndex] = {
                  key: suggestion.templateKey,
                  include: true,
                  selected: true
                };
                usedTemplateKeys.add(suggestion.templateKey);
              }
            }

            // Update selected values
            const templateFieldsObj = Object.values(newValues).map(({ key, selected }) => ({ key, selected }));
            setSelectedValues(templateFieldsObj);

            return newValues;
          });
        }
      } catch (error) {
        // Silently fail - fallback to string similarity is already applied
      }
    };

    enhanceWithLLM();
  }, [uploadColumns, templateColumns, backendUrl, importerKey]);

  const templateFields: { [key: string]: InputOption } = useMemo(
    () => templateColumns.reduce((acc, tc) => ({ ...acc, [tc.name]: { value: tc.key, required: tc.required } }), {}),
    [JSON.stringify(templateColumns)]
  );

  const handleTemplateChange = (uploadColumnIndex: number, key: string) => {
    setValues((prev) => {
      const templatesFields = { ...prev, [uploadColumnIndex]: { ...prev[uploadColumnIndex], key: key, include: !!key, selected: !!key } };
      const templateFieldsObj = Object.values(templatesFields).map(({ key, selected }) => ({ key, selected }));
      setSelectedValues(templateFieldsObj);
      return templatesFields;
    });
  };

  const handleUseChange = (id: number, value: boolean) => {
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], include: !!prev[id].key && value } }));
  };

  const yourFileColumn = t("Your File Column");
  const yourSampleData = t("Your Sample Data");
  const destinationColumn = t("Destination Column");
  const include = t("Include");

  const rows = useMemo(() => {
    return uploadColumns.map((uc, index) => {
      const { name, sample_data } = uc;
      const suggestion = values?.[index] || {};
      const samples = sample_data.filter((d) => d);

      return {
        [yourFileColumn]: {
          raw: name || false,
          content: name || <em>{t("- empty -")}</em>,
        },
        [yourSampleData]: {
          raw: "",
          content: (
            <div title={samples.join(", ")} className={style.samples}>
              {samples.map((d, i) => (
                <small key={i}>{d}</small>
              ))}
            </div>
          ),
        },
        [destinationColumn]: {
          raw: "",
          content: (
            <DropdownFields
              options={templateFields}
              value={suggestion.key}
              placeholder={t("- Select one -")}
              onChange={(key: string) => handleTemplateChange(index, key)}
              selectedValues={selectedValues}
              updateSelectedValues={setSelectedValues}
            />
          ),
        },
        [include]: {
          raw: false,
          content: (
            <div className="flex justify-center">
              <Checkbox
                checked={suggestion.include}
                disabled={!suggestion.key || isLoading}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUseChange(index, e.target.checked)}
              />
            </div>
          ),
        },
      };
    });
  }, [values, isLoading]);

  return {
    rows,
    formValues: values
  };
}
