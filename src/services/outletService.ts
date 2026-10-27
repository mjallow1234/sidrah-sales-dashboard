import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import { OutletRepository } from '@/repositories/OutletRepository';
import { ValidationError, NotFoundError } from './errors';
import { OutletSalesRepAccessRepository, type EntryProduct } from '@/repositories/OutletSalesRepAccessRepository';

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
  const assignedRep = session.role === 'agent';
  if (!isAdmin(session.role) && !assignedRep) throw new Error('Forbidden');
  if (assignedRep && !(await new OutletSalesRepAccessRepository(getPool()).hasActive(outletId, session.userId))) throw new Error('Forbidden');
  await getOutlet(outletId, 'admin');
  const productId = text(input.product_id, 'product_id', true) as string;
  const quantity = Number(input.quantity); const clientPrice = Number(input.selling_price);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new ValidationError('quantity must be greater than zero.');
  if (!Number.isFinite(clientPrice) || clientPrice < 0) throw new ValidationError('selling_price must be zero or greater.');
  const saleDate = dateOnly(input.sale_date); const paymentMethod = text(input.payment_method, 'payment_method', true) as string; const notes = text(input.notes, 'notes'); const timestamp = now();
  return transaction(async (connection) => {
    const [outletRows] = await connection.execute<any[]>('SELECT outlet_id FROM outlets WHERE outlet_id = :outlet_id AND active = 1 FOR UPDATE', { outlet_id: outletId });
    if (!outletRows.length) throw new ValidationError('Outlet is inactive or does not exist.');
    const [products] = await connection.execute<any[]>('SELECT product_id, default_unit_price FROM products WHERE product_id = :product_id AND active = 1 LIMIT 1', { product_id: productId });
    if (!products.length) throw new ValidationError('Product must be an active product.');
    const price = clientPrice;
    const [stockRows] = await connection.execute<any[]>(`SELECT COALESCE((SELECT SUM(quantity_received) FROM outlet_stock_receipts WHERE outlet_id=:outlet_id AND product_id=:product_id),0) - COALESCE((SELECT SUM(i.quantity) FROM outlet_sales os JOIN outlet_sale_items i ON i.sale_id=os.sale_id WHERE os.outlet_id=:outlet_id AND i.product_id=:product_id),0) AS available_stock`, { outlet_id: outletId, product_id: productId });
    if (Number(stockRows[0]?.available_stock ?? 0) < quantity) throw new ValidationError('Insufficient stock available for this outlet.');
    const repo = new OutletRepository(connection); const saleId = `OSALE_${randomUUID().replace(/-/g,'').slice(0,20)}`; const itemId = `OSITEM_${randomUUID().replace(/-/g,'').slice(0,20)}`; const lineTotal = Math.round(quantity * price * 100) / 100;
    return repo.createSale({ sale_id: saleId, sale_item_id: itemId, outlet_id: outletId, product_id: productId, quantity, selling_price: price, line_total: lineTotal, sale_date: saleDate, payment_method: paymentMethod, notes, recorded_by: session.userId, created_at: timestamp });
  });
}

export async function listMySales(outletId: string, query: { from?: string; to?: string }, session: { userId: string; role?: string }) {
  if (session.role !== 'agent' || !(await new OutletSalesRepAccessRepository(getPool()).hasActive(outletId, session.userId))) throw new Error('Forbidden');
  if (query.from && !/^\d{4}-\d{2}-\d{2}$/.test(query.from)) throw new ValidationError('from must use YYYY-MM-DD.');
  if (query.to && !/^\d{4}-\d{2}-\d{2}$/.test(query.to)) throw new ValidationError('to must use YYYY-MM-DD.');
  return new OutletRepository(getPool()).sales(outletId, { ...query, recordedBy: session.userId });
}

export async function getSalesEntryContext(outletId: string, session: { userId: string; role?: string }): Promise<{ outlet: { outlet_id: string; name: string }; products: EntryProduct[] }> {
  if (!isAdmin(session.role) && !(session.role === 'agent' && await new OutletSalesRepAccessRepository(getPool()).hasActive(outletId, session.userId))) throw new Error('Forbidden');
  const outlet = await getOutlet(outletId, 'admin');
  if (!outlet.active) throw new ValidationError('Outlet is inactive.');
  const [rows] = await getPool().execute<any[]>(`SELECT p.product_id,p.product_name,p.unit,p.default_unit_price,COALESCE(r.total_received,0)-COALESCE(s.total_sold,0) AS available_stock FROM products p LEFT JOIN (SELECT product_id,SUM(quantity_received) total_received FROM outlet_stock_receipts WHERE outlet_id=:outlet_id GROUP BY product_id) r ON r.product_id=p.product_id LEFT JOIN (SELECT i.product_id,SUM(i.quantity) total_sold FROM outlet_sales os JOIN outlet_sale_items i ON i.sale_id=os.sale_id WHERE os.outlet_id=:outlet_id GROUP BY i.product_id) s ON s.product_id=p.product_id WHERE p.active=1 ORDER BY p.product_name`, { outlet_id: outletId });
  return { outlet: { outlet_id: outlet.outlet_id, name: outlet.name }, products: rows.map((r) => ({ product_id: String(r.product_id), product_name: String(r.product_name), unit: String(r.unit), default_unit_price: Number(r.default_unit_price), available_stock: Number(r.available_stock ?? 0) })) };
}
