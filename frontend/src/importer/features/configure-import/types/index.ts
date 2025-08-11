import { Template } from '../../../types';

export interface ConfigureImportProps {
  template: Template;
  data: any;
  onSuccess: (mapping: any, headerRow: number) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  importerKey?: string;
  backendUrl?: string;
}

export interface TemplateColumnMapping {
  key: string;
  name: string;
  include: boolean;
}

export interface ColumnMapping {
  [uploadColumnIndex: number]: TemplateColumnMapping;
}