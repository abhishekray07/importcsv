import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { InfoIcon } from "lucide-react";
import Errors from "../../components/Errors";
import Table from "../../components/Table";
import { Template, UploadColumn } from "../../types";
import useMapColumnsTable from "./hooks/useMapColumnsTable";
import { MapColumnsProps, TemplateColumnMapping } from "./types";
import style from "./style/MapColumns.module.scss";
import { Button } from "../../components/ui/button";
import { cn } from "../../../utils/classes";

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

  return (
    <div className={style.content}>
      {/* LLM matching removed for better UX */}
      <form onSubmit={onSubmit}>
        {data ? (
          <div className={style.tableWrapper}>
            <Table data={rows} background="dark" fixHeader columnWidths={["20%", "30%", "30%", "20%"]} columnAlignments={["", "", "", "center"]} />
          </div>
        ) : (
          <>{t("Loading...")}</>
        )}

        <div className={cn(style.actions, "flex justify-between mt-4")}>
          <Button 
            type="button" 
            variant="outline"
            onClick={onCancel} 
            disabled={isSubmitting}
            className="px-6 font-medium"
          >
            {skipHeaderRowSelection ? t("Cancel") : t("Back")}
          </Button>
          {!!error && (
            <div className={style.errorContainer}>
              <Errors error={error} />
            </div>
          )}
          <Button
            type="submit"
            isLoading={isSubmitting}
            variant="default"
            className="px-6 font-medium"
          >
            {t("Continue")}
          </Button>
        </div>
      </form>
    </div>
  );
}
