export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatDateOnly(value: string | undefined): string {
  if (!value || !isValidDateOnly(value)) return 'Not specified';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.toLocaleDateString(undefined, { dateStyle: 'long' });
}

export function formatLocalDateInput(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
