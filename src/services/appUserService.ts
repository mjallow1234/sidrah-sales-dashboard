import type { AppUser } from '@/lib/types';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$/, '');
}

function makeUrl(path: string) {
  const base = ensureBaseUrl();
  const keyParam = GAS_API_KEY ? `&api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  const normalizedPath = encodeURIComponent(path.replace(/^[\/#]+/, ''));
  return `${base}?path=${normalizedPath}${keyParam}`;
}
type AppUserServiceResult = {
  status: number;
  ok: boolean;
  payload: unknown;
  text: string;
};
function normalizePhone(value: unknown) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function extractAppUsers(data: unknown): AppUser[] {
  if (!data || typeof data !== 'object') {
    return [];
  }

  if (Array.isArray(data)) {
    return data as AppUser[];
  }

  if (Array.isArray((data as any).items)) {
    return (data as any).items as AppUser[];
  }

  if (Array.isArray((data as any).data)) {
    return (data as any).data as AppUser[];
  }

  if (Array.isArray((data as any).data?.items)) {
    return (data as any).data.items as AppUser[];
  }

  return [];
}

async function fetchFromAppsScript(path: string, init?: RequestInit): Promise<AppUserServiceResult> {
  const url = makeUrl(path);
  const response = await fetch(url, init);
  const text = await response.text();

  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // preserve raw text when not JSON
  }

  return {
    status: response.status,
    ok: response.ok,
    payload,
    text,
  };
}

export async function fetchAppUsersFromAppsScript(): Promise<AppUser[]> {
  const result = await fetchFromAppsScript('/appusers', { method: 'GET' });
  if (!result.ok) {
    throw new Error(`Apps Script request failed with status ${result.status}: ${result.text}`);
  }

  const payload = (result.payload as any)?.data ?? result.payload;
  return extractAppUsers(payload);
}

export async function fetchAppUserByPhone(phone: string): Promise<AppUser | null> {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  const users = await fetchAppUsersFromAppsScript();
  return users.find((user) => normalizePhone(user.phone) === normalizedPhone) ?? null;
}

export async function fetchAppUserById(id: string): Promise<AppUserServiceResult> {
  return fetchFromAppsScript(`/appusers/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function createAppUser(payload: Record<string, unknown>): Promise<AppUserServiceResult> {
  return fetchFromAppsScript('/appuser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateAppUser(id: string, payload: Record<string, unknown>): Promise<AppUserServiceResult> {
  return fetchFromAppsScript(`/appuser/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _method: 'PUT', ...payload }),
  });
}
