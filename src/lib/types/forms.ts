export const FORM_FIELD_TYPES = ['short_text', 'long_text', 'number', 'phone', 'email', 'date', 'dropdown', 'radio', 'checkboxes', 'yes_no'] as const;
export type FormFieldType = typeof FORM_FIELD_TYPES[number];
export type FormStatus = 'draft' | 'published' | 'archived';

export interface FormFieldDefinition {
  field_id: string;
  field_key: string;
  field_type: FormFieldType;
  label: string;
  order_index: number;
  is_required: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  options?: string[];
  is_protected: boolean;
  system_key?: string | null;
}

export interface FormVersion {
  form_version_id: string;
  form_id: string;
  version_number: number;
  status: FormStatus;
  fields: FormFieldDefinition[];
  created_at: string;
  published_at?: string | null;
}

export interface FormDefinition {
  form_id: string;
  form_key: string;
  name: string;
  description?: string | null;
  form_type: string;
  status: FormStatus;
  versions: FormVersion[];
  draft?: FormVersion | null;
  published?: FormVersion | null;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  submission_id: string;
  form_id: string;
  form_version_id: string;
  submitted_by: string;
  payload: Record<string, unknown>;
  status: string;
  submitted_at: string;
}
