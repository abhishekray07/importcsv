import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "../../../i18n/useTranslation";
import { Box, Text, useMediaQuery } from "@chakra-ui/react";
import { UploaderWrapperProps } from "./types";
import { PiCloudArrowUp } from "react-icons/pi";

export default function UploaderWrapper({ onSuccess, setDataError, ...props }: UploaderWrapperProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [isMobile] = useMediaQuery("(max-width: 480px)");

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
    <Box
      width="100%"
      bg="white"
      borderRadius="12px"
      boxShadow="0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
      overflow="hidden"
    >
      <Box
        {...getRootProps()}
        width="100%"
        minHeight={isMobile ? "200px" : "280px"}
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        py={isMobile ? 8 : 12}
        px={isMobile ? 4 : 8}
        bg="#F9FAFB"
        border="2px dashed"
        borderColor={isDragActive ? "var(--color-primary)" : "#E5E7EB"}
        borderRadius="12px"
        cursor="pointer"
        transition="all 0.2s ease"
        _hover={{
          bg: "#F3F4F6",
          borderColor: "var(--color-primary-300)",
        }}
        onClick={open}
      >
        <input {...getInputProps()} />
        
        {/* Upload Icon */}
        <Box
          mb={4}
          p={3}
          borderRadius="full"
          bg="white"
          boxShadow="0 1px 2px 0 rgba(0, 0, 0, 0.05)"
          color={isDragActive ? "var(--color-primary)" : "#6B7280"}
          transition="all 0.2s ease"
        >
          <PiCloudArrowUp size={32} />
        </Box>
        
        {isDragActive ? (
          <Text fontSize={isMobile ? "md" : "lg"} fontWeight="500" color="#111827">
            {t("Drop your file here")}
          </Text>
        ) : loading ? (
          <Text fontSize={isMobile ? "md" : "lg"} fontWeight="500" color="#111827">
            {t("Loading...")}
          </Text>
        ) : (
          <Text 
            fontSize={isMobile ? "md" : "lg"} 
            fontWeight="500" 
            color="#111827"
          >
            {t("Drop a file or click to browse")}
          </Text>
        )}
      </Box>
    </Box>
  );
}