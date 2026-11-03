import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';

const STATISTICS_SQL = `SELECT
  COUNT(*) AS total_vendors,
  SUM(CASE WHEN v.status = 'inactive' THEN 1 ELSE 0 END) AS inactive_vendors,
  SUM(CASE WHEN v.status = 'active' OR (v.status = 'dormant' AND (lv.latest_visit_date IS NULL OR lv.latest_visit_date >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 14 DAY))) THEN 1 ELSE 0 END) AS active_vendors,
  SUM(CASE WHEN vt.name = 'Market Vendor' THEN 1 ELSE 0 END) AS market_vendors,
  SUM(CASE WHEN vt.name = 'Street Food Vendor (STV)' THEN 1 ELSE 0 END) AS street_food_vendors,
  SUM(CASE WHEN vt.name = 'Minimarket' THEN 1 ELSE 0 END) AS minimarkets,
  SUM(CASE WHEN vt.name = 'Supermarket' THEN 1 ELSE 0 END) AS supermarkets,
  SUM(CASE WHEN vt.name = 'Restaurant' THEN 1 ELSE 0 END) AS restaurants
FROM vendors v
LEFT JOIN vendor_types vt ON vt.vendor_type_id = v.vendor_type_id
LEFT JOIN (
  SELECT vendor_id, MAX(COALESCE(timestamp, date)) AS latest_visit_date
  FROM visit_logs WHERE COALESCE(is_reversed, 0) = 0 GROUP BY vendor_id
) lv ON lv.vendor_id = v.vendor_id`;

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (session.role !== 'admin' && session.role !== 'super_admin') return forbiddenResponse();

  try {
    const [rows] = await query<any[]>(STATISTICS_SQL);
    const row = rows[0] ?? {};
    const metrics = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value) || 0]));
    return Response.json({ status: 'success', data: metrics });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
