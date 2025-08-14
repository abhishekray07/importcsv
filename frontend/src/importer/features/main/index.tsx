import Papa from "papaparse";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../components/ui/button";
import Errors from "../../components/Errors";
import Stepper from "../../components/Stepper";
import Validation from "../validation/Validation";
import { CSVImporterProps } from "../../../types";
import useCustomStyles from "../../hooks/useCustomStyles";
import { Template } from "../../types";
import { convertRawTemplate } from "../../utils/template";
import { parseObjectOrStringJSON } from "../../utils/utils";
import { TemplateColumnMapping } from "../map-columns/types";
import useStepNavigation, { StepEnum } from "./hooks/useStepNavigation";
import { FileData, FileRow } from "./types";
import style from "./style/Main.module.scss";
import Complete from "../complete";
import MapColumns from "../map-columns";
import RowSelection from "../row-selection";
import ConfigureImport from "../configure-import";
import Uploader from "../uploader";
import { X } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import config from "../../../config";
import IframeWrapper from "../../components/IframeWrapper";

export default function Main(props: CSVImporterProps) {
  const {
    isModal = true,
    modalOnCloseTriggered = () => null,
    onComplete,
    customStyles,
    showDownloadTemplateButton,
    skipHeaderRowSelection,
    importerKey,
    backendUrl = config.apiBaseUrl,
    user,
    metadata,
    useIframe = true, // Default to using iframe for CSS isolation
    demoData,
  } = props;
  const skipHeader = skipHeaderRowSelection ?? false;
  const isDemoMode = !!demoData;

  const { t } = useTranslation();

  // Apply custom styles
  useCustomStyles(parseObjectOrStringJSON("customStyles", customStyles));

  // Stepper handler - using consolidated flow
  const useConsolidatedFlow = true; // Using consolidated flow to combine header selection and mapping
  // Start at MapColumns step if demo mode is active
  const initialStep = isDemoMode ? StepEnum.MapColumns : StepEnum.Upload;
  const { currentStep, setStep, goNext, goBack, stepper, setStorageStep } = useStepNavigation(initialStep, skipHeader, useConsolidatedFlow, isDemoMode);

  // Error handling
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // File data
  const emptyData = {
    fileName: "",
    rows: [],
    sheetList: [],
    errors: [],
  };
  const [data, setData] = useState<FileData>(emptyData);

  // Header row selection state
  const [selectedHeaderRow, setSelectedHeaderRow] = useState<number | null>(0);

  // Map of upload column index -> TemplateColumnMapping
  const [columnMapping, setColumnMapping] = useState<{ [index: number]: TemplateColumnMapping }>({});

  // Used in the final step to show a loading indicator while the data is submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [parsedTemplate, setParsedTemplate] = useState<Template>({
    columns: [],
  });
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);
  const [includeUnmatchedColumns, setIncludeUnmatchedColumns] = useState<boolean>(false);
  const [filterInvalidRows, setFilterInvalidRows] = useState<boolean>(false);
  const [disableOnInvalidRows, setDisableOnInvalidRows] = useState<boolean>(false);

  // Initialize demo data if provided
  useEffect(() => {
    if (isDemoMode && demoData) {
      // Parse the demo CSV content
      Papa.parse(demoData.csvContent, {
        complete: function (results) {
          const csvData = results.data as Array<Array<string>>;
          const isNotBlankRow = (row: string[]) => row.some((cell) => cell.toString().trim() !== "");
          const rows: FileRow[] = csvData.filter(isNotBlankRow).map((row: string[], index: number) => ({ index, values: row }));
          
          setData({
            fileName: demoData.fileName,
            rows: rows,
            sheetList: [],
            errors: results.errors.map((error) => error.message),
          });
        },
        error: function(error: any) {
          console.error('Papa.parse error:', error);
        }
      });
    }
  }, [isDemoMode, demoData]);

  // Fetch schema from the backend using importerKey
  useEffect(() => {
    const fetchSchema = async () => {
      // ImporterKey is required
      if (!importerKey) {
        setInitializationError("ImporterKey is required for CSV import. Please provide a valid importer key.");
        return;
      }

      try {
        setIsLoadingSchema(true);
        // Fetch schema from the backend
        const response = await fetch(`${backendUrl}/api/v1/imports/key/schema?importer_key=${importerKey}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch schema: ${response.statusText}`);
        }

        const schemaData = await response.json();

        // Store the include_unmatched_columns setting from the importer configuration
        if (schemaData.include_unmatched_columns !== undefined) {
          setIncludeUnmatchedColumns(schemaData.include_unmatched_columns);
        }

        // Store the filter_invalid_rows setting from the importer configuration
        if (schemaData.filter_invalid_rows !== undefined) {
          setFilterInvalidRows(schemaData.filter_invalid_rows);
        }

        // Store the disable_on_invalid_rows setting from the importer configuration
        if (schemaData.disable_on_invalid_rows !== undefined) {
          setDisableOnInvalidRows(schemaData.disable_on_invalid_rows);
        }

        // Convert the schema to the format expected by the importer
        const schemaTemplate = {
          columns: schemaData.fields.map((field: any) => {
            return {
              name: field.name,
              key: field.key || field.name.toLowerCase().replace(/\s+/g, "_"), // Convert to snake_case for keys if key is not provided
              required: field.required || false,
              description: field.description || `${field.name} field`,
              type: field.type, // Use the type directly from backend
              data_type: field.type, // Also store as data_type for compatibility
              validation_format: field.validation_format,
            };
          }),
        };

        const [parsedTemplate, parsedTemplateError] = convertRawTemplate(schemaTemplate);
        
        if (parsedTemplateError) {
          setInitializationError(parsedTemplateError);
        } else if (parsedTemplate) {
          setParsedTemplate(parsedTemplate);
        }
      } catch (error) {
        setInitializationError(`Failed to fetch schema: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoadingSchema(false);
      }
    };

    fetchSchema();
  }, [importerKey, backendUrl]);

  useEffect(() => {
    // TODO (client-sdk): Have the importer continue where left off if closed
    // Temporary solution to reload state if closed and opened again
    // Don't reload in demo mode - let the demo data load
    if (!isDemoMode && data.rows.length === 0 && currentStep !== StepEnum.Upload) {
      reload();
    }
  }, [data, isDemoMode]);

  // Actions
  const reload = () => {
    setData(emptyData);
    setSelectedHeaderRow(0);
    setColumnMapping({});
    setDataError(null);
    setStep(StepEnum.Upload);
  };

  const requestClose = () => {
    if (!isModal) {
      return;
    }
    modalOnCloseTriggered && modalOnCloseTriggered();
    if (currentStep === StepEnum.Complete) {
      reload();
    }
  };

  const handleValidationComplete = (validatedData: FileData) => {
    // Update data with validated values
    setData(validatedData);
    setIsSubmitting(true);

    // TODO (client-sdk): Move this type, add other data attributes (i.e. column definitions), and move the data processing to a function
    type MappedRow = {
      data: Record<string, number | string>; // Mapped data
      unmapped_data: Record<string, string>; // Unmapped data
    };
    const startIndex = (selectedHeaderRow || 0) + 1;

    // Process rows to create data structure with mapped and unmapped data
    const headerRow = validatedData.rows[selectedHeaderRow || 0];
    const mappedRows = validatedData.rows.slice(startIndex).map((row) => {
      // Initialize the result structure
      const resultingRow: MappedRow = {
        data: {},
        unmapped_data: {},
      };

      // Process each cell in the row
      row.values.forEach((value, valueIndex) => {
        const mapping = columnMapping[valueIndex];
        const headerValue = headerRow.values[valueIndex];

        // Normalize the value (handle empty/null/NaN)
        const normalizedValue = (value === undefined || value === null || value === '' ||
          (typeof value === 'number' && isNaN(value))) ? "" : value.toString();

        if (mapping && mapping.include) {
          // Add to mapped data
          resultingRow.data[mapping.key] = normalizedValue;
        } else if (includeUnmatchedColumns && headerValue) {
          // Add to unmapped data if setting is enabled
          const columnKey = headerValue.toString().toLowerCase().replace(/\s+/g, "_");
          resultingRow.unmapped_data[columnKey] = normalizedValue;
        }
      });

      return resultingRow;
    });

    const includedColumns = Object.values(columnMapping).filter(({ include }) => include);

    const onCompleteData = {
      num_rows: mappedRows.length,
      num_columns: includedColumns.length,
      error: null,
      columns: includedColumns.map(({ key }) => ({ key, name: key })),
      rows: mappedRows,
    };

    // Check if importerKey is provided - it's required
    if (!importerKey) {
      setDataError("ImporterKey is required for CSV import. Please provide a valid importer key.");
      setIsSubmitting(false);
      return;
    }

    // Transform data for the backend format
    const transformedData = {
      validData: mappedRows,
      invalidData: [], // We don't track invalid rows in this version
    };

    // Transform column mapping to a format expected by the backend
    const columnMappingForBackend: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([index, mapping]) => {
      if (mapping.include) {
        columnMappingForBackend[index] = mapping.key;
      }
    });

    // Use the public endpoint for processing imports
    const apiEndpoint = `${backendUrl}/api/v1/imports/key/process`;

    // Prepare the request payload
    const payload = {
      ...transformedData,
      columnMapping: columnMappingForBackend,
      user: user || {},
      metadata: metadata || {},
      importer_key: importerKey || "",
    };

    // Send the data to the backend

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to process import: ${response.statusText}`);
        }
        return response.json();
      })
      .then((result) => {
        // Call onComplete with the simplified backend response


        // The backend now returns a simplified response with just success/failure status
        // and a job_id that can be used to track the job
        if (result.success) {
          onComplete &&
            onComplete({
              success: true,
              message: result.message || "Import job successfully enqueued",
              num_rows: mappedRows.length,
              num_columns: includedColumns.length,
            });
        } else {
          onComplete &&
            onComplete({
              success: false,
              message: result.message || "Failed to process import",
              num_rows: mappedRows.length,
              num_columns: includedColumns.length,
            });
        }
      })
      .catch((error) => {
        // Call onComplete with the error

        onComplete &&
          onComplete({
            success: false,
            message: error.message || "Error processing import",
            num_rows: mappedRows.length,
            num_columns: includedColumns.length,
          });
      });

    setIsSubmitting(false);
    goNext();
  };

  const handleBackToMapColumns = () => {
    goBack(StepEnum.MapColumns);
  };

  if (initializationError) {
    return (
      <div className={style.wrapper}>
        <Errors error={initializationError} centered />
      </div>
    );
  }

  const renderContent = () => {
    switch (currentStep) {
      case StepEnum.Upload:
        return (
          <Uploader
            template={parsedTemplate}
            skipHeaderRowSelection={skipHeader || false}
            showDownloadTemplateButton={showDownloadTemplateButton}
            setDataError={setDataError}
            onSuccess={async (file: File) => {
              setDataError(null);
              const fileType = file.name.slice(file.name.lastIndexOf(".") + 1);
              if (!["csv", "xls", "xlsx"].includes(fileType)) {
                setDataError(t("Only CSV, XLS, and XLSX files can be uploaded"));
                return;
              }
              const reader = new FileReader();
              const isNotBlankRow = (row: string[]) => row.some((cell) => cell.toString().trim() !== "");
              reader.onload = async (e) => {
                const bstr = e?.target?.result;
                if (!bstr) {
                  return;
                }
                switch (fileType) {
                  case "csv":
                    Papa.parse(bstr.toString(), {
                      complete: function (results) {
                        const csvData = results.data as Array<Array<string>>;
                        const rows: FileRow[] = csvData.filter(isNotBlankRow).map((row: string[], index: number) => ({ index, values: row }));
                        setData({
                          fileName: file.name,
                          rows: rows,
                          sheetList: [],
                          errors: results.errors.map((error) => error.message),
                        });
                        goNext();
                      },
                    });
                    break;
                  case "xlsx":
                  case "xls":
                    const workbook = XLSX.read(bstr as string, { type: "binary" });
                    const sheetList = workbook.SheetNames;
                    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetList[0]], { header: 1 }) as Array<Array<string>>;
                    const rows: FileRow[] = data.filter(isNotBlankRow).map((row: string[], index: number) => ({ index, values: row }));
                    setData({
                      fileName: file.name,
                      rows: rows,
                      sheetList: sheetList,
                      errors: [], // TODO: Handle any parsing errors
                    });
                    goNext();
                    break;
                }
              };

              switch (fileType) {
                case "csv":
                  reader.readAsText(file, "utf-8");
                  break;
                case "xlsx":
                case "xls":
                  reader.readAsBinaryString(file);
                  break;
              }
            }}
          />
        );
      case StepEnum.RowSelection:
        // Skip if using consolidated flow
        if (useConsolidatedFlow) {
          goNext();
          return null;
        }
        return (
          <RowSelection
            data={data}
            onCancel={reload}
            onSuccess={() => goNext()}
            selectedHeaderRow={selectedHeaderRow}
            setSelectedHeaderRow={setSelectedHeaderRow}
          />
        );
      case StepEnum.MapColumns:
        // Use consolidated ConfigureImport component if enabled
        if (useConsolidatedFlow) {
          return (
            <ConfigureImport
              template={parsedTemplate}
              data={data}
              onSuccess={(mapping, headerRow) => {
                setColumnMapping(mapping);
                setSelectedHeaderRow(headerRow);
                goNext();
              }}
              onCancel={isDemoMode ? undefined : () => goBack(StepEnum.Upload)}
              isSubmitting={isSubmitting}
              importerKey={importerKey}
              backendUrl={backendUrl}
              isDemoMode={isDemoMode}
            />
          );
        }
        // Legacy flow
        return (
          <MapColumns
            template={parsedTemplate}
            data={data}
            columnMapping={columnMapping}
            skipHeaderRowSelection={skipHeader}
            selectedHeaderRow={selectedHeaderRow}
            onSuccess={(columns) => {
              setColumnMapping(columns);
              goNext();
            }}
            isSubmitting={isSubmitting}
            importerKey={importerKey}
            backendUrl={backendUrl}
            onCancel={skipHeader ? reload : () => goBack(StepEnum.RowSelection)}
          />
        );
      case StepEnum.Validation:
        return (
          <Validation
            template={parsedTemplate}
            data={data}
            columnMapping={columnMapping}
            selectedHeaderRow={selectedHeaderRow}
            onSuccess={handleValidationComplete}
            onCancel={handleBackToMapColumns}
            isSubmitting={isSubmitting}
            backendUrl={backendUrl}
            importerKey={importerKey}
            filterInvalidRows={filterInvalidRows}
            disableOnInvalidRows={disableOnInvalidRows}
          />
        );
      case StepEnum.Complete:
        return <Complete reload={reload} close={requestClose} isModal={isModal} />;
      default:
        return null;
    }
  };

  const content = (
    <div className={style.wrapper}>
      <div>
        <Stepper {...stepper} />
      </div>

      <div className={style.content}>{renderContent()}</div>

      {!!dataError && (
        <div className={style.status}>
          <div></div>
          <Errors error={dataError} centered />
          <div></div>
        </div>
      )}

      {isModal && (
        <button
          className={`${style.close} rounded-full p-2 hover:bg-gray-100 transition-colors`}
          aria-label="Close"
          onClick={requestClose}
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  // Wrap in iframe for complete CSS isolation if enabled
  if (useIframe) {
    return (
      <IframeWrapper className="importcsv-iframe">
        {content}
      </IframeWrapper>
    );
  }

  // Legacy mode without iframe (for backwards compatibility)
  return (
    <div style={{
      width: '100%',
      overflow: 'visible',
      position: 'relative',
      isolation: 'isolate',
      contain: 'layout style',
      boxSizing: 'border-box'
    }}>
      {content}
    </div>
  );
}
