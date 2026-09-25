import type { FactoryExpense, FactoryExpenseCategory, FactoryExpensePaymentMethod, FactoryExpensePaymentMethodOption, FactoryExpenseSummary } from '@/lib/types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface ExpenseFilters { from?: string; to?: string; categoryId?: string; paymentMethod?: FactoryExpensePaymentMethod; search?: string; }

export class FactoryExpenseRepository extends BaseRepository {
  public async listPaymentMethods(includeInactive = true): Promise<FactoryExpensePaymentMethodOption[]> {
    const [rows] = await this.execute<any[]>(`SELECT payment_method_id,name,is_active FROM factory_expense_payment_methods ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY name ASC`);
    return rows.map((row) => ({ payment_method_id: String(row.payment_method_id), name: String(row.name), is_active: Boolean(row.is_active) }));
  }

  public async createPaymentMethod(paymentMethodId: string, name: string): Promise<FactoryExpensePaymentMethodOption> {
    await this.execute(`INSERT INTO factory_expense_payment_methods (payment_method_id,name,is_active) VALUES (?,?,1)`, [paymentMethodId, name]);
    const [rows] = await this.execute<any[]>(`SELECT payment_method_id,name,is_active FROM factory_expense_payment_methods WHERE payment_method_id = ?`, [paymentMethodId]);
    return { payment_method_id: String(rows[0].payment_method_id), name: String(rows[0].name), is_active: Boolean(rows[0].is_active) };
  }

  public async updatePaymentMethod(paymentMethodId: string, updates: { name?: string; is_active?: boolean }): Promise<FactoryExpensePaymentMethodOption> {
    const fields: string[] = []; const values: unknown[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active); }
    if (!fields.length) throw new Error('No payment method changes supplied.');
    values.push(paymentMethodId);
    const [result] = await this.execute<any>(`UPDATE factory_expense_payment_methods SET ${fields.join(', ')}, updated_at = NOW() WHERE payment_method_id = ?`, values);
    if (!result.affectedRows) throw new NotFoundError('Expense payment method', paymentMethodId);
    const [rows] = await this.execute<any[]>(`SELECT payment_method_id,name,is_active FROM factory_expense_payment_methods WHERE payment_method_id = ?`, [paymentMethodId]);
    return { payment_method_id: String(rows[0].payment_method_id), name: String(rows[0].name), is_active: Boolean(rows[0].is_active) };
  }

  public async listCategories(includeInactive = true): Promise<FactoryExpenseCategory[]> {
    const [rows] = await this.execute<any[]>(`SELECT category_id,name,category_group,is_active FROM factory_expense_categories ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY name ASC`);
    return rows.map((row) => ({ category_id: String(row.category_id), name: String(row.name), category_group: row.category_group == null ? null : String(row.category_group), is_active: Boolean(row.is_active) }));
  }

  public async createCategory(categoryId: string, name: string, group: string | null, actor: string): Promise<FactoryExpenseCategory> {
    await this.execute(`INSERT INTO factory_expense_categories (category_id,name,category_group,is_active,created_by) VALUES (?,?,?,?,1)`, [categoryId, name, group, actor]);
    const [rows] = await this.execute<any[]>(`SELECT category_id,name,category_group,is_active FROM factory_expense_categories WHERE category_id = ?`, [categoryId]);
    return { category_id: String(rows[0].category_id), name: String(rows[0].name), category_group: rows[0].category_group == null ? null : String(rows[0].category_group), is_active: Boolean(rows[0].is_active) };
  }

  public async updateCategory(categoryId: string, updates: { name?: string; category_group?: string | null; is_active?: boolean }): Promise<FactoryExpenseCategory> {
    const fields: string[] = []; const values: unknown[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.category_group !== undefined) { fields.push('category_group = ?'); values.push(updates.category_group); }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active); }
    if (!fields.length) throw new Error('No category changes supplied.');
    values.push(categoryId);
    const [result] = await this.execute<any>(`UPDATE factory_expense_categories SET ${fields.join(', ')}, updated_at = NOW() WHERE category_id = ?`, values);
    if (!result.affectedRows) throw new NotFoundError('Expense category', categoryId);
    const [rows] = await this.execute<any[]>(`SELECT category_id,name,category_group,is_active FROM factory_expense_categories WHERE category_id = ?`, [categoryId]);
    return { category_id: String(rows[0].category_id), name: String(rows[0].name), category_group: rows[0].category_group == null ? null : String(rows[0].category_group), is_active: Boolean(rows[0].is_active) };
  }

  private mapExpense(row: any): FactoryExpense {
    return { expense_id: String(row.expense_id), expense_date: String(row.expense_date), category_id: String(row.category_id), category_name: String(row.category_name), category_group: row.category_group == null ? null : String(row.category_group), description: row.description == null ? null : String(row.description), amount: Number(row.amount), quantity: row.quantity == null ? null : Number(row.quantity), unit: row.unit == null ? null : String(row.unit), unit_price: row.unit_price == null ? null : Number(row.unit_price), paid_to: row.paid_to == null ? null : String(row.paid_to), payment_method: row.payment_method, reference: row.reference == null ? null : String(row.reference), notes: row.notes == null ? null : String(row.notes), status: row.status, recorded_by: String(row.recorded_by), recorded_by_name: row.recorded_by_name == null ? undefined : String(row.recorded_by_name), created_at: String(row.created_at), updated_at: String(row.updated_at), voided_by: row.voided_by == null ? null : String(row.voided_by), voided_by_name: row.voided_by_name == null ? null : String(row.voided_by_name), voided_at: row.voided_at == null ? null : String(row.voided_at), void_reason: row.void_reason == null ? null : String(row.void_reason) };
  }

  public async listExpenses(filters: ExpenseFilters = {}): Promise<FactoryExpense[]> {
    const clauses: string[] = []; const params: Record<string, unknown> = {};
    if (filters.from) { clauses.push('e.expense_date >= :from_date'); params.from_date = filters.from; }
    if (filters.to) { clauses.push('e.expense_date <= :to_date'); params.to_date = filters.to; }
    if (filters.categoryId) { clauses.push('e.category_id = :category_id'); params.category_id = filters.categoryId; }
    if (filters.paymentMethod) { clauses.push('e.payment_method = :payment_method'); params.payment_method = filters.paymentMethod; }
    if (filters.search) { clauses.push('(e.description LIKE :search OR e.paid_to LIKE :search)'); params.search = `%${filters.search}%`; }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await this.execute<any[]>(`SELECT e.*, c.name AS category_name, c.category_group, u.name AS recorded_by_name, vu.name AS voided_by_name FROM factory_expenses e JOIN factory_expense_categories c ON c.category_id=e.category_id JOIN app_users u ON u.user_id=e.recorded_by LEFT JOIN app_users vu ON vu.user_id=e.voided_by ${where} ORDER BY e.expense_date DESC,e.created_at DESC`, params);
    return rows.map((row) => this.mapExpense(row));
  }

  public async summary(filters: ExpenseFilters = {}): Promise<FactoryExpenseSummary> {
    const clauses: string[] = ['e.status = \'active\'']; const params: Record<string, unknown> = {};
    if (filters.from) { clauses.push('e.expense_date >= :from_date'); params.from_date = filters.from; }
    if (filters.to) { clauses.push('e.expense_date <= :to_date'); params.to_date = filters.to; }
    if (filters.categoryId) { clauses.push('e.category_id = :category_id'); params.category_id = filters.categoryId; }
    if (filters.paymentMethod) { clauses.push('e.payment_method = :payment_method'); params.payment_method = filters.paymentMethod; }
    if (filters.search) { clauses.push('(e.description LIKE :search OR e.paid_to LIKE :search)'); params.search = `%${filters.search}%`; }
    const where = clauses.join(' AND ');
    const [rows] = await this.execute<any[]>(`SELECT COALESCE(SUM(CASE WHEN e.expense_date = CURRENT_DATE THEN e.amount ELSE 0 END),0) AS today, COALESCE(SUM(CASE WHEN YEAR(e.expense_date)=YEAR(CURRENT_DATE) AND MONTH(e.expense_date)=MONTH(CURRENT_DATE) THEN e.amount ELSE 0 END),0) AS this_month, COALESCE(SUM(e.amount),0) AS total, COUNT(*) AS count FROM factory_expenses e WHERE ${where}`, params);
    return { today: Number(rows[0]?.today ?? 0), this_month: Number(rows[0]?.this_month ?? 0), total: Number(rows[0]?.total ?? 0), count: Number(rows[0]?.count ?? 0) };
  }

  public async createExpense(payload: Record<string, unknown>): Promise<FactoryExpense> {
    await this.execute(`INSERT INTO factory_expenses (expense_id,expense_date,category_id,description,amount,quantity,unit,unit_price,paid_to,payment_method,reference,notes,recorded_by) VALUES (:expense_id,:expense_date,:category_id,:description,:amount,:quantity,:unit,:unit_price,:paid_to,:payment_method,:reference,:notes,:recorded_by)`, payload);
    const rows = await this.listExpenses({});
    const found = rows.find((row) => row.expense_id === payload.expense_id);
    if (!found) throw new NotFoundError('Expense', String(payload.expense_id));
    return found;
  }

  public async voidExpense(expenseId: string, actor: string, reason: string): Promise<FactoryExpense> {
    const [result] = await this.execute<any>(`UPDATE factory_expenses SET status='voided',voided_by=:actor,voided_at=NOW(),void_reason=:reason,updated_at=NOW() WHERE expense_id=:expense_id AND status='active'`, { expense_id: expenseId, actor, reason });
    if (!result.affectedRows) throw new Error('Expense was not found or is already voided.');
    const rows = await this.listExpenses({}); const found = rows.find((row) => row.expense_id === expenseId); if (!found) throw new NotFoundError('Expense', expenseId); return found;
  }
}
