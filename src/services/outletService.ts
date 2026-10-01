import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import { OutletRepository } from '@/repositories/OutletRepository';
import { ValidationError, NotFoundError } from './errors';

const isAdmin = (role?: string) => role === 'admin' || role === 'super_admin';
const text = (value: unknown, field: string, required = false): string | null => { if (value === undefined || value === null || String(value).trim() === '') { if (required) throw new ValidationError(`${field} is required.`); return null; } if (typeof value !== 'string') throw new ValidationError(`${field} must be text.`); return value.trim(); };
const dateOnly = (value: unknown): string => { const result = text(value, 'sale_date', true) as string; if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new ValidationError('sale_date must use YYYY-MM-DD.'); const [y,m,d] = result.split('-').map(Number); const parsed = new Date(Date.UTC(y,m-1,d)); if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m-1 || parsed.getUTCDate() !== d) throw new ValidationError('sale_date is invalid.'); return result; };
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };
function assertAdmin(role?: string) { if (!isAdmin(role)) throw new Error('Forbidden'); }

export async function listOutlets(role?: string) { assertAdmin(role); return new OutletRepository(getPool()).list(); }
export async function getOutlet(outletId: string, role?: string) { assertAdmin(role); const repo = new OutletRepository(getPool()); const outlet = await repo.findById(outletId); if (!outlet) throw new NotFoundError('Outlet', outletId); return outlet; }
export async function createOutlet(input: Record<string, unknown>, session: { userId: string; role?: string }) { assertAdmin(session.role); const name = text(input.name, 'name', true) as string; const timestamp = now(); return new OutletRepository(getPool()).create({ outlet_id: `OUTLET_${randomUUID().replace(/-/g,'').slice(0,20)}`, name, location: text(input.location,'location'), responsible_person: text(input.responsible_person,'responsible_person'), phone: text(input.phone,'phone'), description: text(input.description,'description'), active: input.active === undefined ? true : Boolean(input.active), created_by: session.userId, updated_by: session.userId, created_at: timestamp, updated_at: timestamp }); }
export async function updateOutlet(outletId: string, input: Record<string, unknown>, session: { userId: string; role?: string }) { assertAdmin(session.role); await getOutlet(outletId, session.role); const updates: Record<string, unknown> = { updated_by: session.userId, updated_at: now() }; for (const field of ['name','location','responsible_person','phone','description']) if (input[field] !== undefined) updates[field] = text(input[field], field, field === 'name'); if (input.active !== undefined) updates.active = Boolean(input.active); const outlet = await new OutletRepository(getPool()).update(outletId, updates); if (!outlet) throw new NotFoundError('Outlet', outletId); return outlet; }
export async function listSales(outletId: string, query: { from?: string; to?: string }, role?: string) { await getOutlet(outletId, role); if (query.from && !/^\d{4}-\d{2}-\d{2}$/.test(query.from)) throw new ValidationError('from must use YYYY-MM-DD.'); if (query.to && !/^\d{4}-\d{2}-\d{2}$/.test(query.to)) throw new ValidationError('to must use YYYY-MM-DD.'); return new OutletRepository(getPool()).sales(outletId, query); }
export async function getOutletSummary(outletId: string, role?: string) { await getOutlet(outletId, role); return new OutletRepository(getPool()).summary(outletId, today(), monthStart()); }
export async function createSale(outletId: string, input: Record<string, unknown>, session: { userId: string; role?: string }) {
  assertAdmin(session.role); await getOutlet(outletId, session.role);
  const productId = text(input.product_id, 'product_id', true) as string;
  const quantity = Number(input.quantity); const price = Number(input.selling_price);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new ValidationError('quantity must be greater than zero.');
  if (!Number.isFinite(price) || price < 0) throw new ValidationError('selling_price must be zero or greater.');
  const saleDate = dateOnly(input.sale_date); const paymentMethod = text(input.payment_method, 'payment_method', true) as string; const notes = text(input.notes, 'notes'); const timestamp = now();
  return transaction(async (connection) => {
    const [products] = await connection.execute('SELECT product_id FROM products WHERE product_id = :product_id AND active = 1 LIMIT 1', { product_id: productId });
    if (!(products as unknown[]).length) throw new ValidationError('Product must be an active product.');
    const repo = new OutletRepository(connection); const saleId = `OSALE_${randomUUID().replace(/-/g,'').slice(0,20)}`; const itemId = `OSITEM_${randomUUID().replace(/-/g,'').slice(0,20)}`; const lineTotal = Math.round(quantity * price * 100) / 100;
    return repo.createSale({ sale_id: saleId, sale_item_id: itemId, outlet_id: outletId, product_id: productId, quantity, selling_price: price, line_total: lineTotal, sale_date: saleDate, payment_method: paymentMethod, notes, recorded_by: session.userId, created_at: timestamp });
  });
}
