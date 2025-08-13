import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "../../../i18n/useTranslation";
import { Box, Text } from "../ui/flex";
import { UploaderWrapperProps } from "./types";
import { PiCloudArrowUp } from "react-icons/pi";

export default function UploaderWrapper({ onSuccess, setDataError, ...props }: UploaderWrapperProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

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
      {...getRootProps()}
      className={`w-full flex justify-center items-center flex-col bg-gray-50 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 ${
        isMobile ? 'min-h-[180px] py-8 px-6' : 'min-h-[240px] py-10 px-8'
      } ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={open}
    >
      <input {...getInputProps()} />
      
      {/* Upload Icon */}
      <Box
        className={`mb-3 p-3 rounded-full bg-white transition-all duration-200 ${
          isDragActive ? 'text-blue-600 shadow-md' : 'text-gray-400'
        }`}
      >
        <PiCloudArrowUp size={isMobile ? 28 : 32} />
      </Box>
      
      {isDragActive ? (
        <Text className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-700`}>
          {t("Drop your file here")}
        </Text>
      ) : loading ? (
        <Text className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-700`}>
          {t("Loading...")}
        </Text>
      ) : (
        <Text 
          className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-700`}
        >
          {t("Drop a file or click to browse")}
        </Text>
      )}
    </Box>
  );
}