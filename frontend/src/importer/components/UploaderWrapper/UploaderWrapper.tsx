import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "../../../i18n/useTranslation";
import { Button } from "@chakra-ui/button";
import { Box, Text, useMediaQuery } from "@chakra-ui/react";
import useThemeStore from "../../stores/theme";
import { UploaderWrapperProps } from "./types";
import { PiArrowCounterClockwise, PiFile } from "react-icons/pi";

export default function UploaderWrapper({ onSuccess, setDataError, ...props }: UploaderWrapperProps) {
  const [loading, setLoading] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const { t } = useTranslation();
  const [isMobile] = useMediaQuery("(max-width: 480px)");

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
    // maxSize: 1 * Math.pow(1024, 3),
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
    onDropRejected: (fileRejections) => {
      setLoading(false);
      // const errorMessage = fileRejections.map((fileRejection) => fileRejection.errors[0].message).join(", ");
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
    <Box
      padding={isMobile ? "8px" : "10px"}
      border="1px solid var(--color-border)"
      borderRadius="var(--border-radius-2)"
      width="100%"
    >
      <Box
        {...getRootProps()}
        width="100%"
        height="auto"
        minHeight={isMobile ? "100px" : "120px"}
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        flex={1}
        py={isMobile ? 2 : 3}
        px={isMobile ? 2 : 3}
        border="2px dashed var(--color-border)"
        borderRadius="var(--border-radius-2)">
        <input {...getInputProps()} />
        {isDragActive ? (
          <Text fontSize={isMobile ? "sm" : "md"}>{t("Drop your file here")}</Text>
        ) : loading ? (
          <Text fontSize={isMobile ? "sm" : "md"}>{t("Loading...")}</Text>
        ) : (
          <>
            <Text mb={1} fontSize={isMobile ? "sm" : "md"}>{t("Drop your file here")}</Text>
            <Text fontSize={isMobile ? "xs" : "sm"} mb={1}>{t("or")}</Text>
            <Button
              leftIcon={<PiFile />}
              onClick={open}
              size={isMobile ? "xs" : "sm"}
              colorScheme={"secondary"}
              variant={theme === "light" ? "outline" : "solid"}
              _hover={
                theme === "light"
                  ? {
                      background: "var(--color-border)",
                      color: "var(--color-text)",
                    }
                  : undefined
              }>
              {t("Browse files")}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
