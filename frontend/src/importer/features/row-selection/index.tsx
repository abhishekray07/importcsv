import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@chakra-ui/alert";
import Table from "../../components/Table";
import Tooltip from "../../components/Tooltip";
import { RowSelectionProps } from "./types";
import style from "./style/RowSelection.module.scss";
import { PiWarningCircle } from "react-icons/pi";
import { Button } from "../../components/ui/button";
import { cn } from "../../../utils/classes";

export default function RowSelection({ data, onSuccess, onCancel, selectedHeaderRow, setSelectedHeaderRow }: RowSelectionProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedHeaderRow(Number(e.target.value));
  };
  const rowLimit = 50;

  const dataWithRadios = data.rows.slice(0, rowLimit).map((row) => {
    const nameWithRadio = (
      <span>
        <input
          type="radio"
          id={`radio-${row.index}`}
          className={style.inputRadio}
          name="rowSelection"
          value={row.index}
          checked={selectedHeaderRow === row.index}
          onChange={handleRadioChange}
        />
        {row.values?.[0]}
      </span>
    );
    const mappedRow = Object.entries(row.values).map(([key, value]) => {
      return [
        key,
        {
          raw: value,
          content: key === "0" ? nameWithRadio : <span>{value}</span>,
          tooltip: value,
        },
      ];
    });
    return Object.fromEntries(mappedRow);
  });

  const maxNumberOfColumns = 7;
  const uploadRow = data.rows[0] ?? { values: {} };
  const numberOfColumns = Math.min(Object.keys(uploadRow.values).length, maxNumberOfColumns);
  const widthPercentage = 100 / numberOfColumns;
  const columnWidths = Array(numberOfColumns).fill(`${widthPercentage}%`);
  const hasMultipleExcelSheets = (data.sheetList.length ?? 0) > 1;

  const handleNextClick = (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    onSuccess();
    setIsLoading(false);
  };

  return (
    <div className={style.content}>
      <form>
        {data ? (
          <>
            {hasMultipleExcelSheets ? (
              <Alert status="info">
                <PiWarningCircle className={style.warningIcon} />
                {t(
                  "Only the first sheet (&quot;{{sheet}}&quot;) of the Excel file will be imported. To import multiple sheets, please upload each sheet individually.",
                  { sheet: data.sheetList[0] }
                )}
              </Alert>
            ) : null}
            <div className={style.tableWrapper}>
              <Table
                fixHeader
                mergeThemes={true}
                data={dataWithRadios || []}
                heading={
                  <div className={style.headingCaption}>
                    <Tooltip title={t("Select the row which contains the column headers")}>{t("Select Header Row")}</Tooltip>
                  </div>
                }
                keyAsId="index"
                background="zebra"
                columnWidths={columnWidths}
                columnAlignments={Array(numberOfColumns).fill("left")}
                onRowClick={(row) => setSelectedHeaderRow(dataWithRadios?.indexOf(row) || 0)}
              />
            </div>
          </>
        ) : (
          <>{t("Loading...")}</>
        )}

        <div className={cn(style.actions, "flex justify-between mt-4")}>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={isLoading}
            className="px-6 font-medium"
          >
            {t("Back")}
          </Button>
          <Button 
            type="submit"
            variant="default"
            onClick={handleNextClick} 
            isLoading={isLoading}
            className="px-6 font-medium"
          >
            {t("Continue")}
          </Button>
        </div>
        {/*{!isLoading && !!error && (*/}
        {/*  <div className={style.errorContainer}>*/}
        {/*    <Errors error={error} />*/}
        {/*  </div>*/}
        {/*)}*/}
      </form>
    </div>
  );
}
