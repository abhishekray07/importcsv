// import { Resource } from "i18next";

type ModalParams = {
  isModal?: boolean;
  modalIsOpen?: boolean;
  modalOnCloseTriggered?: () => void;
  modalCloseOnOutsideClick?: boolean;
};

// Create a custom Resource type to replace i18next's
type CustomTranslationResource = {
  [language: string]: {
    [key: string]: string;
  };
};

export type CSVImporterProps = {
  darkMode?: boolean;
  primaryColor?: string;
  className?: string; // Keep className as it's often used for styling wrappers
  onComplete?: (data: any) => void;
  waitOnComplete?: boolean;
  customStyles?: Record<string, string> | string;
  showDownloadTemplateButton?: boolean;
  skipHeaderRowSelection?: boolean;
  language?: string;
  customTranslations?: CustomTranslationResource;
  importerKey?: string; // Key of the importer from the admin/backend
  backendUrl?: string; // URL of the backend API
  user?: Record<string, any>; // User details to identify the user in webhooks
  metadata?: Record<string, any>; // Additional data to associate with the import
  // You might want to explicitly allow specific data-* attributes if needed
  // 'data-testid'?: string;
} & ModalParams;
