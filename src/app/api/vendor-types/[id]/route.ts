import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { isAdminRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';

function idFrom(request: Request) { return new URL(request.url).pathname.split('/').filter(Boolean).pop() || ''; }

export async function DELETE(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  const id = idFrom(request);
  const [result] = await query<any>('DELETE FROM vendor_types WHERE vendor_type_id = ? AND NOT EXISTS (SELECT 1 FROM vendors WHERE vendor_type_id = ?)', [id, id]);
  if (!result.affectedRows) {
    const [existing] = await query<any[]>('SELECT vendor_type_id FROM vendor_types WHERE vendor_type_id = ? LIMIT 1', [id]);
    return Response.json({ status: 'error', message: existing.length ? 'This vendor type is in use and cannot be deleted.' : 'Vendor type not found.' }, { status: existing.length ? 409 : 404 });
  }
  return Response.json({ status: 'success', data: null });
}
