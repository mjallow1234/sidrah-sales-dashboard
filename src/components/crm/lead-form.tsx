'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormFieldDefinition } from '@/lib/types/forms';
import type { CrmLead } from '@/lib/types/crm';
import { usePublishedLeadFormQuery } from '@/lib/hooks/formDefinitionQueries';
import { useCreateCrmLeadMutation, useUpdateCrmLeadMutation } from '@/lib/hooks/crmLeadQueries';

const today = () => new Date().toISOString().slice(0, 10);
const knownLeadKeys = new Set(['lead_name', 'phone', 'location', 'business_type', 'lead_source', 'captured_at', 'status', 'next_follow_up_date', 'notes']);

function fieldValue(lead: CrmLead | undefined, key: string): unknown {
  if (!lead) return key === 'captured_at' ? today() : key === 'status' ? 'new' : '';
  return (lead as unknown as Record<string, unknown>)[key] ?? '';
}

function labelForKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());
}

function LeadField({ field, value, onChange }: { field: FormFieldDefinition; value: unknown; onChange: (value: unknown) => void }) {
  const current = String(value ?? '');
  const options = field.options ?? [];
  if (field.field_type === 'long_text') return <label className="block text-sm">{field.label}{field.is_required ? ' *' : ''}<textarea required={field.is_required} rows={4} value={current} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border p-3" /></label>;
  if (field.field_type === 'dropdown') return <label className="block text-sm">{field.label}{field.is_required ? ' *' : ''}<select required={field.is_required} value={current} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border p-3"><option value="">Select</option>{current && !options.includes(current) ? <option value={current}>{current} (existing value)</option> : null}{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
  const inputType = field.field_type === 'date' ? 'date' : field.field_type === 'phone' ? 'tel' : field.field_type === 'number' ? 'number' : 'text';
  return <label className="block text-sm">{field.label}{field.is_required ? ' *' : ''}<input required={field.is_required} type={inputType} value={current} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-2xl border p-3" /></label>;
}

function DisabledLeadField({ lead, fieldKey }: { lead: CrmLead; fieldKey: string }) {
  const value = fieldValue(lead, fieldKey);
  if (value === '' || value === null || value === undefined) return null;
  return <label className="block text-sm text-slate-500">{labelForKey(fieldKey)} (disabled)<input disabled value={String(value)} className="mt-1 w-full rounded-2xl border bg-slate-50 p-3 text-slate-500" /></label>;
}

export function LeadForm({ lead, onDone }: { lead?: CrmLead; onDone: (lead: CrmLead) => void }) {
  const definitionQuery = usePublishedLeadFormQuery();
  const definition = definitionQuery.data;
  const fields = useMemo(() => definition?.published?.fields ?? [], [definition]);
  const mutation = lead ? useUpdateCrmLeadMutation() : useCreateCrmLeadMutation();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fields.length) return;
    setForm(Object.fromEntries(fields.map(field => [field.system_key ?? field.field_key, fieldValue(lead, field.system_key ?? field.field_key)])));
  }, [fields, lead]);

  const set = (key: string, value: unknown) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    for (const field of fields) {
      const key = field.system_key ?? field.field_key;
      const value = form[key];
      if (field.is_required && (value === undefined || value === null || value === '' || Array.isArray(value) && value.length === 0)) {
        setError(`${field.label} is required.`);
        return;
      }
      if (field.field_type === 'dropdown' && value !== undefined && value !== '' && !(field.options ?? []).includes(String(value))) {
        setError(`${field.label} has an invalid option.`);
        return;
      }
    }
    try {
      const payload = { ...form };
      if (lead && payload.status === lead.status) delete payload.status;
      const result = lead ? await (mutation as any).mutateAsync({ leadId: lead.lead_id, payload }) : await (mutation as any).mutateAsync(payload);
      onDone(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save lead.');
    }
  }

  if (definitionQuery.isLoading) return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Loading Lead form configuration…</p>;
  if (definitionQuery.isError || !definition) return <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">Unable to load the published Lead form configuration.</p>;

  const configuredKeys = new Set(fields.map(field => field.system_key ?? field.field_key));
  const disabledFields = lead ? Array.from(knownLeadKeys).filter(key => !configuredKeys.has(key)) : [];
  return <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><h2 className="text-xl font-semibold">{lead ? 'Edit lead' : 'Create lead'}</h2>{error ? <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}<div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <LeadField key={field.field_id} field={field} value={form[field.system_key ?? field.field_key]} onChange={value => set(field.system_key ?? field.field_key, value)} />)}{disabledFields.map(key => <DisabledLeadField key={key} lead={lead!} fieldKey={key} />)}</div><button disabled={mutation.isPending} className="rounded-2xl bg-sidrah-500 px-5 py-3 font-semibold text-white">{mutation.isPending ? 'Saving...' : 'Save lead'}</button></form>;
}
