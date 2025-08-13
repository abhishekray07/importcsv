import { FormEvent, useState, useEffect } from "react";
import { useTranslation } from "../../../i18n/useTranslation";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Flex, Text } from "../../components/ui/flex";
import { Tooltip } from "../../components/ui/tooltip";
import { PiInfo } from "react-icons/pi";
import Errors from "../../components/Errors";
import Table from "../../components/Table";
import { Template, UploadColumn } from "../../types";
import useMapColumnsTable from "./hooks/useMapColumnsTable";
import { MapColumnsProps, TemplateColumnMapping } from "./types";
import style from "./style/MapColumns.module.scss";

export default function MapColumns({
  template,
  data,
  columnMapping,
  selectedHeaderRow,
  skipHeaderRowSelection,
  onSuccess,
  onCancel,
  isSubmitting,
  importerKey,
  backendUrl,
}: MapColumnsProps) {
  if (data.rows.length === 0) {
    return null;
  }

  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const headerRowIndex = selectedHeaderRow ? selectedHeaderRow : 0;
  let sampleDataRows = data.rows.slice(headerRowIndex + 1, headerRowIndex + 4);

  // No longer using LLM suggestions

  const uploadColumns: UploadColumn[] = data.rows[headerRowIndex]?.values.map((cell, index) => {
    let sample_data = sampleDataRows.map((row) => row.values[index]);
    return {
      index: index,
      name: cell,
      sample_data,
    };
  });
  const { rows, formValues } = useMapColumnsTable(
    uploadColumns,
    template.columns,
    columnMapping,
    isSubmitting,
    importerKey,
    backendUrl
  );
  const [error, setError] = useState<string | null>(null);

  const verifyRequiredColumns = (template: Template, formValues: { [uploadColumnIndex: number]: TemplateColumnMapping }): boolean => {
    const requiredColumns = template.columns.filter((column: any) => column.required);
    const includedValues = Object.values(formValues).filter((value: any) => value.include);
    return requiredColumns.every((requiredColumn: any) => includedValues.some((includedValue: any) => includedValue.key === requiredColumn.key));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const columns = Object.entries(formValues).reduce(
      (acc, [index, columnMapping]) =>
        columnMapping.include
          ? {
              ...acc,
              [index]: columnMapping,
            }
          : acc,
      {}
    );

    const isRequiredColumnsIncluded = verifyRequiredColumns(template, formValues);
    if (!isRequiredColumnsIncluded) {
      setError(t("Please include all required columns"));
      return;
    }

    onSuccess(columns);
  };

  // Adjust column widths based on screen size
  const getColumnWidths = () => {
    if (isMobile) {
      return ["25%", "25%", "25%", "25%"];
    }
    return ["20%", "30%", "30%", "20%"];
  };

  return (
    <div className={style.content}>
      {/* LLM matching removed for better UX */}
      <form onSubmit={onSubmit}>
        {data ? (
          <div className={style.tableWrapper}>
            <Table data={rows} background="dark" fixHeader columnWidths={getColumnWidths()} columnAlignments={["", "", "", "center"]} />
          </div>
        ) : (
          <>{t("Loading...")}</>
        )}

        <div className={style.actions}>
          <Button 
            type="button" 
            variant="outline"
            onClick={onCancel} 
            disabled={isSubmitting}
          >
            {skipHeaderRowSelection ? t("Cancel") : t("Back")}
          </Button>
          {!!error && (
            <div className={style.errorContainer}>
              <Errors error={error} />
            </div>
          )}
          <Button isLoading={isSubmitting} type="submit">
            {t("Continue")}
          </Button>
        </div>
      </form>
    </div>
  );
}
