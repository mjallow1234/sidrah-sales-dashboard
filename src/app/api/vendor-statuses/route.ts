import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  try {
    const [rows] = await query<any[]>('SELECT status_id, name, is_active FROM vendor_statuses WHERE is_active = 1 ORDER BY status_id ASC');
    return Response.json({ status: 'success', data: rows.map((row) => ({ status_id: String(row.status_id), name: String(row.name), is_active: Boolean(row.is_active) })) });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
