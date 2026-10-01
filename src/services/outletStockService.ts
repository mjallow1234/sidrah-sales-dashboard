import { getPool } from '@/lib/db';
import { OutletRepository } from '@/repositories/OutletRepository';
import { OutletStockRepository } from '@/repositories/OutletStockRepository';
import { ValidationError, NotFoundError } from './errors';

const isAdmin = (role?: string) => role === 'admin' || role === 'super_admin';
const text = (value: unknown, field: string, required = false): string | null => { if (value === undefined || value === null || String(value).trim() === '') { if (required) throw new ValidationError(`${field} is required.`); return null; } if (typeof value !== 'string') throw new ValidationError(`${field} must be text.`); return value.trim(); };
const dateOnly = (value: unknown): string => { const result = text(value, 'received_date', true) as string; if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new ValidationError('received_date must use YYYY-MM-DD.'); const [y,m,d] = result.split('-').map(Number); const parsed = new Date(Date.UTC(y,m-1,d)); if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m-1 || parsed.getUTCDate() !== d) throw new ValidationError('received_date is invalid.'); return result; };
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
function assertAdmin(role?: string) { if (!isAdmin(role)) throw new Error('Forbidden'); }

export async function getStock(outletId: string, role?: string) { assertAdmin(role); const outlet = await new OutletRepository(getPool()).findById(outletId); if (!outlet) throw new NotFoundError('Outlet', outletId); const repo = new OutletStockRepository(getPool()); return { balances: await repo.balances(outletId), receipts: await repo.receipts(outletId) }; }

export async function createReceipt(outletId: string, input: Record<string, unknown>, session: { userId: string; role?: string }) {
  assertAdmin(session.role); const outlet = await new OutletRepository(getPool()).findById(outletId); if (!outlet) throw new NotFoundError('Outlet', outletId); if (!outlet.active) throw new ValidationError('Stock cannot be received into an inactive outlet.');
  const productId = text(input.product_id, 'product_id', true) as string; const quantity = Number(input.quantity_received); if (!Number.isFinite(quantity) || quantity <= 0) throw new ValidationError('quantity_received must be greater than zero.'); const receivedDate = dateOnly(input.received_date); const notes = text(input.notes, 'notes');
  const [products] = await getPool().execute('SELECT product_id FROM products WHERE product_id = :product_id LIMIT 1', { product_id: productId }); if (!(products as unknown[]).length) throw new ValidationError('Product does not exist.');
  return new OutletStockRepository(getPool()).create({ outlet_id: outletId, product_id: productId, quantity_received: quantity, received_date: receivedDate, notes, created_by: session.userId, created_at: now() });
}
