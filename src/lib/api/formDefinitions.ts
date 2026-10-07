import type { FormDefinition } from '@/lib/types/forms';
async function request<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } }); const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Request failed.'); return body.data as T; }
export const listFormDefinitions = () => request<FormDefinition[]>('/api/form-definitions');
export const createFormDefinition = (payload: unknown) => request<FormDefinition>('/api/form-definitions', { method: 'POST', body: JSON.stringify(payload) });
export const getFormDefinition = (formId: string) => request<FormDefinition>(`/api/form-definitions/${formId}`);
export const saveFormDraft = (formId: string, payload: unknown) => request<FormDefinition>(`/api/form-definitions/${formId}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const publishFormDefinition = (formId: string) => request<FormDefinition>(`/api/form-definitions/${formId}/publish`, { method: 'POST' });
export const getLiveForm = (formKey: string) => request<FormDefinition>(`/api/forms/${formKey}`);
export const getPublishedLeadForm = () => request<FormDefinition>('/api/form-definitions/lead');
export const submitLiveForm = (formKey: string, payload: unknown) => request<void>(`/api/forms/${formKey}`, { method: 'POST', body: JSON.stringify(payload) });
