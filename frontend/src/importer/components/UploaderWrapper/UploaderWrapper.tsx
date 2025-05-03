import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import useThemeStore from "../../stores/theme";
import { UploaderWrapperProps } from "./types";
import { FileIcon, UploadIcon, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../../utils/classes";

export default function UploaderWrapper({ onSuccess, setDataError, ...props }: UploaderWrapperProps) {
  const [loading, setLoading] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const { t } = useTranslation();

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
    onDropRejected: (fileRejections) => {
      setLoading(false);
      const errorMessage = fileRejections[0].errors[0].message;
      setDataError(errorMessage);
    },
    onDropAccepted: async ([file]) => {
      setLoading(true);
      onSuccess(file);
      setLoading(false);
    },
  });

  return (
    <div className="p-4 border border-border rounded-md">
      <div
        {...getRootProps()}
        className={cn(
          "w-full flex justify-center items-center flex-col p-6 border-2 border-dashed rounded-md transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border",
          "min-h-[140px]"
        )}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <div className="text-center space-y-1">
            <UploadIcon className="w-8 h-8 mx-auto text-primary animate-bounce" />
            <p className="font-medium">{t("Drop your file here")}</p>
          </div>
        ) : loading ? (
          <div className="text-center space-y-1">
            <Loader2 className="w-7 h-7 mx-auto text-primary animate-spin" />
            <p>{t("Loading...")}</p>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <FileIcon className="w-8 h-8 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">{t("Drop your file here")}</p>
              <p className="text-xs text-muted-foreground">{t("Supports CSV, XLS, and XLSX files")}</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">{t("or")}</span>
              <Button 
                onClick={open}
                variant={theme === "light" ? "outline" : "default"}
                size="sm"
                className="gap-1 mt-1">
                <FileIcon className="w-3 h-3" />
                {t("Browse files")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
