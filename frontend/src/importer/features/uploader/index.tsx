import { useTranslation } from "../../../i18n/useTranslation";
import { Button, Box, Flex, Text, Link } from "@chakra-ui/react";
import Table from "../../components/Table";
import UploaderWrapper from "../../components/UploaderWrapper/UploaderWrapper";
import useTemplateTable from "./hooks/useTemplateTable";
import { UploaderProps } from "./types";
import style from "./style/Uploader.module.scss";
import { PiDownloadSimple, PiInfo } from "react-icons/pi";

export default function Uploader({ 
  template, 
  skipHeaderRowSelection, 
  onSuccess, 
  showDownloadTemplateButton, 
  setDataError 
}: UploaderProps) {
  const fields = useTemplateTable(template.columns);
  const uploaderWrapper = (
    <UploaderWrapper 
      onSuccess={onSuccess} 
      skipHeaderRowSelection={skipHeaderRowSelection} 
      setDataError={setDataError} 
    />
  );
  showDownloadTemplateButton = showDownloadTemplateButton ?? true;
  const { t } = useTranslation();

  function downloadTemplate() {
    const { columns } = template;
    const csvData = `${columns.map((obj) => obj.name).join(",")}`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvData], { type: "text/csv" }));
    link.download = "example.csv";
    link.click();
  }

  return (
    <div className={style.modernContent}>
      {/* Title Section */}
      <Box mb={6}>
        <Text fontSize="2xl" fontWeight="600" color="#111827" mb={2}>
          {t("Upload a CSV file")}
        </Text>
        <Text fontSize="md" color="#6B7280">
          {t("Make sure file includes contact name and phone number")}
        </Text>
      </Box>

      {/* Upload Area */}
      {uploaderWrapper}

      {/* Footer Links */}
      <Flex mt={4} align="center" justify="space-between" flexWrap="wrap" gap={2}>
        <Flex align="center" gap={4}>
          <Link 
            fontSize="sm" 
            color="#6B7280"
            textDecoration="underline"
            _hover={{ color: "var(--color-primary)" }}
          >
            <Flex align="center" gap={1}>
              <PiInfo size={16} />
              {t("Learn more about importing contacts")}
            </Flex>
          </Link>
          <Text fontSize="sm" color="#9CA3AF">or</Text>
          {showDownloadTemplateButton && (
            <Link
              fontSize="sm"
              color="var(--color-primary)"
              textDecoration="underline"
              onClick={downloadTemplate}
              cursor="pointer"
              _hover={{ color: "var(--color-primary-700)" }}
            >
              {t("download a sample CSV file")}
            </Link>
          )}
        </Flex>
      </Flex>

      {/* Template Info Card (Hidden on mobile, shown if needed) */}
      {fields.length > 0 && (
        <Box 
          mt={6}
          p={4}
          bg="white"
          borderRadius="8px"
          border="1px solid #E5E7EB"
          display={{ base: "none", md: "block" }}
        >
          <Text fontSize="sm" fontWeight="600" color="#374151" mb={3}>
            {t("Expected Columns")}
          </Text>
          <Box maxHeight="120px" overflow="auto">
            <Table 
              fixHeader 
              data={fields} 
              background="transparent" 
              columnWidths={["65%", "35%"]} 
              columnAlignments={["", "center"]} 
            />
          </Box>
        </Box>
      )}
    </div>
  );
}