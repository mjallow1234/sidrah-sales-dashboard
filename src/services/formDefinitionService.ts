import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import { isAdminRole, type AppUserRole } from '@/lib/authorization';
import type { FormDefinition, FormFieldDefinition, FormFieldType } from '@/lib/types/forms';
import { FormDefinitionRepository } from '@/repositories/FormDefinitionRepository';
import { ValidationError, NotFoundError } from './errors';

const fieldTypes = new Set<string>(['short_text','long_text','number','phone','email','date','dropdown','radio','checkboxes','yes_no']);
const statuses = new Set(['draft','published','archived']);
const crmLeadFieldTypes: Record<string, Set<string>> = {
  lead_name: new Set(['short_text']), phone: new Set(['short_text', 'phone']), location: new Set(['short_text']),
  business_type: new Set(['short_text', 'dropdown']), lead_source: new Set(['short_text', 'dropdown']),
  captured_at: new Set(['date']), status: new Set(['dropdown']), next_follow_up_date: new Set(['date']), notes: new Set(['long_text', 'short_text']),
};
const crmLeadStatusOptions = ['new', 'follow_up_required', 'converted', 'not_interested', 'lost'];
const id = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const clean = (value: unknown, name: string, required = false): string | null => { if (value == null || String(value).trim() === '') { if (required) throw new ValidationError(`${name} is required.`); return null; } return String(value).trim(); };
function assertAdmin(role: AppUserRole | string | undefined): void { if (!isAdminRole(role)) throw new Error('Forbidden'); }
function normalizeFields(input: unknown): Array<Omit<FormFieldDefinition, 'field_id' | 'order_index'> & { field_id?: string; order_index?: number }> {
  if (!Array.isArray(input)) throw new ValidationError('fields must be an array.');
  const keys = new Set<string>();
  return input.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new ValidationError(`Field ${index + 1} is invalid.`);
    const value = raw as Record<string, unknown>;
    const fieldType = String(value.field_type ?? '');
    if (!fieldTypes.has(fieldType)) throw new ValidationError(`Field ${index + 1} has an unsupported type.`);
    const label = clean(value.label, `Field ${index + 1} label`, true)!;
    const fieldKey = clean(value.field_key, `Field ${index + 1} key`, true)!.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (keys.has(fieldKey)) throw new ValidationError(`Field key ${fieldKey} is duplicated.`);
    keys.add(fieldKey);
    const options = Array.isArray(value.options) ? value.options.map(String).map(v => v.trim()).filter(Boolean) : [];
    if ((fieldType === 'dropdown' || fieldType === 'radio' || fieldType === 'checkboxes') && options.length === 0) throw new ValidationError(`${label} requires at least one option.`);
    return { field_id: value.field_id ? String(value.field_id) : undefined, field_key: fieldKey, field_type: fieldType as FormFieldType, label, is_required: Boolean(value.is_required), placeholder: clean(value.placeholder, 'placeholder'), help_text: clean(value.help_text, 'help text'), options, is_protected: Boolean(value.is_protected), system_key: clean(value.system_key, 'system key'), order_index: index };
  });
}
async function writeFields(repo: FormDefinitionRepository, versionId: string, fields: ReturnType<typeof normalizeFields>) { for (let i = 0; i < fields.length; i += 1) { const field = fields[i]; await repo.createField({ field_id: id('FIELD'), form_version_id: versionId, field_key: field.field_key, field_type: field.field_type, label: field.label, order_index: i, is_required: field.is_required, placeholder: field.placeholder ?? null, help_text: field.help_text ?? null, options_json: field.options?.length ? JSON.stringify(field.options) : null, is_protected: field.is_protected, system_key: field.system_key ?? null }); } }

export async function listForms(role: AppUserRole | string | undefined): Promise<FormDefinition[]> { assertAdmin(role); return new FormDefinitionRepository(getPool()).list(); }
export async function getForm(formId: string, role: AppUserRole | string | undefined): Promise<FormDefinition> { assertAdmin(role); return new FormDefinitionRepository(getPool()).findById(formId); }
export async function createForm(payload: { name?: unknown; form_key?: unknown; description?: unknown; fields?: unknown }, actor: string, role: AppUserRole | string | undefined): Promise<FormDefinition> {
  assertAdmin(role); const name = clean(payload.name, 'name', true)!; const key = clean(payload.form_key, 'form_key', true)!.toLowerCase().replace(/[^a-z0-9_-]/g, '-'); if (key === 'crm-lead') throw new ValidationError('The canonical CRM Lead form already has a protected identity.'); const fields = normalizeFields(payload.fields ?? []); const timestamp = now(); const formId = id('FORM'); const versionId = id('FORMV');
  await transaction(async connection => { const repo = new FormDefinitionRepository(connection); await repo.createDefinition({ form_id: formId, form_key: key, name, description: clean(payload.description, 'description'), form_type: 'standalone', status: 'draft', created_by: actor, updated_by: actor, created_at: timestamp, updated_at: timestamp }); await repo.createVersion({ form_version_id: versionId, form_id: formId, version_number: 1, status: 'draft', created_by: actor, created_at: timestamp }); await writeFields(repo, versionId, fields); });
  return new FormDefinitionRepository(getPool()).findById(formId);
}
export async function saveDraft(formId: string, payload: { name?: unknown; description?: unknown; fields?: unknown }, actor: string, role: AppUserRole | string | undefined): Promise<FormDefinition> {
  assertAdmin(role); const fields = normalizeFields(payload.fields ?? []); const timestamp = now(); await transaction(async connection => { const repo = new FormDefinitionRepository(connection); const current = await repo.findById(formId); if (current.form_key === 'crm-lead') validateCrmLeadFields(fields); let draft = current.draft; if (!draft) { const source = current.published; const versionNumber = (current.versions[0]?.version_number ?? 0) + 1; const versionId = id('FORMV'); await repo.createVersion({ form_version_id: versionId, form_id: formId, version_number: versionNumber, status: 'draft', created_by: actor, created_at: timestamp }); draft = { form_version_id: versionId, form_id: formId, version_number: versionNumber, status: 'draft', fields: source?.fields ?? [], created_at: timestamp }; }
    await repo.deleteDraftFields(draft.form_version_id); await writeFields(repo, draft.form_version_id, fields); await repo.updateDefinition(formId, { name: clean(payload.name, 'name', true)!, description: clean(payload.description, 'description'), status: 'draft', updated_by: actor, updated_at: timestamp }); }); return new FormDefinitionRepository(getPool()).findById(formId);
}
export async function publishForm(formId: string, actor: string, role: AppUserRole | string | undefined): Promise<FormDefinition> { assertAdmin(role); const timestamp = now(); await transaction(async connection => { const repo = new FormDefinitionRepository(connection); const form = await repo.findById(formId); if (!form.draft) throw new ValidationError('A draft version is required before publishing.'); await repo.archivePublished(formId); await repo.updateVersion(form.draft.form_version_id, 'published', timestamp); await repo.updateDefinition(formId, { name: form.name, description: form.description ?? null, status: 'published', updated_by: actor, updated_at: timestamp }); }); return new FormDefinitionRepository(getPool()).findById(formId); }
export async function getPublishedForm(formKey: string): Promise<FormDefinition> { const form = await new FormDefinitionRepository(getPool()).findByKey(formKey); if (!form.published) throw new NotFoundError('Published form', formKey); return form; }

function validateCrmLeadFields(fields: ReturnType<typeof normalizeFields>): void {
  const seen = new Set<string>();
  for (const field of fields) {
    const key = field.system_key ?? field.field_key;
    if (!Object.prototype.hasOwnProperty.call(crmLeadFieldTypes, key) || field.field_key !== key || field.system_key !== key) throw new ValidationError(`Unsupported CRM Lead system key: ${key}.`);
    if (seen.has(key)) throw new ValidationError(`CRM Lead field ${key} is duplicated.`);
    seen.add(key);
    if (!crmLeadFieldTypes[key].has(field.field_type)) throw new ValidationError(`Field ${key} does not support type ${field.field_type}.`);
    if (key === 'lead_name' || key === 'captured_at' || key === 'status') {
      if (!field.is_required) throw new ValidationError(`${key} must remain required.`);
    }
    if (key === 'status') {
      if (JSON.stringify(field.options ?? []) !== JSON.stringify(crmLeadStatusOptions)) throw new ValidationError('CRM Lead status options are fixed.');
    }
    if (field.field_type === 'dropdown' && !(field.options?.length)) throw new ValidationError(`${key} requires at least one option.`);
  }
  if (!seen.has('lead_name')) throw new ValidationError('CRM Lead name cannot be disabled.');
  if (!seen.has('captured_at')) throw new ValidationError('CRM Lead capture date cannot be disabled.');
  if (!seen.has('status')) throw new ValidationError('CRM Lead status cannot be disabled.');
}

export async function submitForm(formKey: string, payload: Record<string, unknown>, actor: string): Promise<void> {
  const form = await getPublishedForm(formKey);
  const version = form.published!;
  for (const field of version.fields) {
    const value = payload[field.field_key];
    if (field.is_required && (value == null || value === '' || Array.isArray(value) && value.length === 0)) throw new ValidationError(`${field.label} is required.`);
    if (value != null && field.field_type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new ValidationError(`${field.label} must be a number.`);
    if (value != null && ['dropdown', 'radio', 'yes_no'].includes(field.field_type) && !(field.options ?? []).includes(String(value))) throw new ValidationError(`${field.label} has an invalid option.`);
  }
  await new FormDefinitionRepository(getPool()).createSubmission({ submission_id: id('SUB'), form_id: form.form_id, form_version_id: version.form_version_id, submitted_by: actor, payload_json: JSON.stringify(payload), submitted_at: now() });
}
