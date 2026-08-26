import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';

function formatDateValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return value === null || value === undefined ? '' : String(value);
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const filters: string[] = ['vb.balance_owed > 0'];
    const params: Record<string, unknown> = {};

    if (isAgentRole(session.role)) {
      if (session.sales_rep_id) {
        filters.push('(v.sales_rep_id IS NULL OR v.sales_rep_id = :session_sales_rep_id)');
        params.session_sales_rep_id = session.sales_rep_id;
      }
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `
      SELECT
        vb.vendor_id,
        v.vendor_name,
        vb.balance_owed,
        COALESCE(MAX(CASE WHEN COALESCE(vl.is_reversed, 0) = 0 THEN vl.date END), '') AS last_visit_date
      FROM vendor_balances vb
      LEFT JOIN vendors v ON v.vendor_id = vb.vendor_id
      LEFT JOIN visit_logs vl ON vl.vendor_id = vb.vendor_id
      ${whereClause}
      GROUP BY vb.vendor_id, v.vendor_name, vb.balance_owed
      ORDER BY vb.balance_owed DESC
    `;

    const [rows] = await dbQuery<any[]>(sql, params);
    const result = rows.map((row) => ({
      vendor_id: String(row.vendor_id),
      vendor_name: String(row.vendor_name ?? row.vendor_id ?? ''),
      balance_owed: Number(row.balance_owed) || 0,
      last_visit_date: formatDateValue(row.last_visit_date),
    }));

    return Response.json({ status: 'success', data: result });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
