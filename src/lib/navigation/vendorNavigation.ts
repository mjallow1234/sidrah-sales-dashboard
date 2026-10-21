export function getSafeReturnTo(value: string | null | undefined, fallback = '/vendors'): string {
  if (!value) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('\\')) return decoded;
  } catch {}
  return fallback;
}

export function vendorHref(vendorId: string, returnTo?: string): string {
  const path = `/vendors/${encodeURIComponent(vendorId)}`;
  return returnTo ? `${path}?returnTo=${encodeURIComponent(getSafeReturnTo(returnTo))}` : path;
}
