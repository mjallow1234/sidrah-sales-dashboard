import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import type { FormDefinition, FormFieldDefinition, FormVersion } from '@/lib/types/forms';

export interface FormWritePayload { form_id: string; form_key: string; name: string; description: string | null; form_type: string; status: 'draft' | 'published' | 'archived'; created_by: string; updated_by: string; created_at: string; updated_at: string; }
export interface VersionWritePayload { form_version_id: string; form_id: string; version_number: number; status: 'draft' | 'published' | 'archived'; created_by: string; created_at: string; published_at?: string | null; }
export interface FieldWritePayload { field_id: string; form_version_id: string; field_key: string; field_type: string; label: string; order_index: number; is_required: boolean; placeholder: string | null; help_text: string | null; options_json: string | null; is_protected: boolean; system_key: string | null; }

export class FormDefinitionRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) { super(db); }
  async list(): Promise<FormDefinition[]> {
    const rows = await this.executeMany<any>('SELECT * FROM form_definitions ORDER BY updated_at DESC');
    return Promise.all(rows.map((row: any) => this.findById(String(row.form_id))));
  }
  async findById(formId: string): Promise<FormDefinition> {
    const row = await this.executeOne<any>('SELECT * FROM form_definitions WHERE form_id = ? LIMIT 1', [formId]);
    const versions = await this.executeMany<any>('SELECT * FROM form_versions WHERE form_id = ? ORDER BY version_number DESC', [formId]);
    const mapped = await Promise.all(versions.map((version: any) => this.mapVersion(version)));
    return { ...this.mapDefinition(row), versions: mapped, draft: mapped.find(v => v.status === 'draft') ?? null, published: mapped.find(v => v.status === 'published') ?? null };
  }
  async findByKey(formKey: string): Promise<FormDefinition> {
    const row = await this.executeOne<any>('SELECT form_id FROM form_definitions WHERE form_key = ? LIMIT 1', [formKey]);
    return this.findById(String(row.form_id));
  }
  private mapDefinition(row: any): FormDefinition { return { form_id: String(row.form_id), form_key: String(row.form_key), name: String(row.name), description: row.description ?? null, form_type: String(row.form_type), status: row.status, versions: [], created_at: String(row.created_at), updated_at: String(row.updated_at) }; }
  private async mapVersion(row: any): Promise<FormVersion> { const fields = await this.executeMany<any>('SELECT * FROM form_fields WHERE form_version_id = ? ORDER BY order_index ASC', [row.form_version_id]); return { form_version_id: String(row.form_version_id), form_id: String(row.form_id), version_number: Number(row.version_number), status: row.status, fields: fields.map((field: any) => this.mapField(field)), created_at: String(row.created_at), published_at: row.published_at == null ? null : String(row.published_at) }; }
  private mapField(row: any): FormFieldDefinition { let options: string[] = []; const rawOptions = row.options_json; if (Array.isArray(rawOptions)) { options = rawOptions.filter((option: unknown): option is string | number => typeof option === 'string' || typeof option === 'number').map(String); } else if (rawOptions) { try { const parsed = JSON.parse(String(rawOptions)); if (Array.isArray(parsed)) options = parsed.filter((option: unknown): option is string | number => typeof option === 'string' || typeof option === 'number').map(String); } catch { options = []; } } return { field_id: String(row.field_id), field_key: String(row.field_key), field_type: row.field_type, label: String(row.label), order_index: Number(row.order_index), is_required: Boolean(row.is_required), placeholder: row.placeholder ?? null, help_text: row.help_text ?? null, options, is_protected: Boolean(row.is_protected), system_key: row.system_key ?? null }; }
  async createDefinition(payload: FormWritePayload): Promise<void> { await this.execute('INSERT INTO form_definitions (form_id,form_key,name,description,form_type,status,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [payload.form_id,payload.form_key,payload.name,payload.description,payload.form_type,payload.status,payload.created_by,payload.updated_by,payload.created_at,payload.updated_at]); }
  async updateDefinition(formId: string, payload: { name: string; description: string | null; status: 'draft'|'published'|'archived'; updated_by: string; updated_at: string }): Promise<void> { await this.execute('UPDATE form_definitions SET name=?,description=?,status=?,updated_by=?,updated_at=? WHERE form_id=?', [payload.name,payload.description,payload.status,payload.updated_by,payload.updated_at,formId]); }
  async createVersion(payload: VersionWritePayload): Promise<void> { await this.execute('INSERT INTO form_versions (form_version_id,form_id,version_number,status,created_by,created_at,published_at) VALUES (?,?,?,?,?,?,?)', [payload.form_version_id,payload.form_id,payload.version_number,payload.status,payload.created_by,payload.created_at,payload.published_at ?? null]); }
  async updateVersion(versionId: string, status: 'draft'|'published'|'archived', publishedAt: string | null): Promise<void> { await this.execute('UPDATE form_versions SET status=?, published_at=? WHERE form_version_id=?', [status,publishedAt,versionId]); }
  async createField(payload: FieldWritePayload): Promise<void> { await this.execute('INSERT INTO form_fields (field_id,form_version_id,field_key,field_type,label,order_index,is_required,placeholder,help_text,options_json,is_protected,system_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [payload.field_id,payload.form_version_id,payload.field_key,payload.field_type,payload.label,payload.order_index,payload.is_required,payload.placeholder,payload.help_text,payload.options_json,payload.is_protected,payload.system_key]); }
  async deleteDraftFields(versionId: string): Promise<void> { await this.execute('DELETE FROM form_fields WHERE form_version_id=?', [versionId]); }
  async archivePublished(formId: string): Promise<void> { await this.execute("UPDATE form_versions SET status='archived' WHERE form_id=? AND status='published'", [formId]); }
  async createSubmission(payload: { submission_id: string; form_id: string; form_version_id: string; submitted_by: string; payload_json: string; submitted_at: string }): Promise<void> { await this.execute('INSERT INTO form_submissions (submission_id,form_id,form_version_id,submitted_by,payload_json,status,submitted_at) VALUES (?,?,?,?,?,\'submitted\',?)', [payload.submission_id,payload.form_id,payload.form_version_id,payload.submitted_by,payload.payload_json,payload.submitted_at]); }
}
