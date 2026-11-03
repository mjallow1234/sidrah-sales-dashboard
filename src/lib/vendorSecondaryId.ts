export const VENDOR_CATEGORY_CODES: Readonly<Record<string, string>> = {
  'Market Vendor': 'MV',
  'Street Food Vendor (STV)': 'ST',
  Minimarket: 'MM',
  Supermarket: 'SM',
  Restaurant: 'RE',
};

/** Returns null for names whose first character cannot provide a reliable initial. */
export function getAcquisitionInitial(name: string | null | undefined): string | null {
  if (typeof name !== 'string') return null;
  const first = name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0];
  return first && /^[A-Za-z]$/.test(first) ? first.toUpperCase() : null;
}

export function getSecondaryVendorPrefix(category: string | null | undefined, acquiredByName: string | null | undefined): string | null {
  if (!category) return null;
  const categoryCode = Object.prototype.hasOwnProperty.call(VENDOR_CATEGORY_CODES, category)
    ? VENDOR_CATEGORY_CODES[category]
    : undefined;
  const initial = getAcquisitionInitial(acquiredByName);
  return categoryCode && initial ? `${categoryCode}${initial}` : null;
}

export function formatSecondaryVendorId(prefix: string, sequence: number): string {
  if (!/^[A-Z]{3}$/.test(prefix) || !Number.isInteger(sequence) || sequence < 1 || sequence > 999) {
    throw new Error('Invalid secondary vendor ID prefix or sequence.');
  }
  return `${prefix}-${String(sequence).padStart(3, '0')}`;
}
