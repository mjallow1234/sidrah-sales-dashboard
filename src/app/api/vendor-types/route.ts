import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { isAdminRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  try {
    const [rows] = await query<any[]>(`SELECT vendor_type_id, name, is_active FROM vendor_types WHERE is_active = 1 ORDER BY name ASC`);
    return Response.json({ status: 'success', data: rows.map((row) => ({ vendor_type_id: String(row.vendor_type_id), name: String(row.name), is_active: Boolean(row.is_active) })) });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  try {
    const payload = await request.json();
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) return Response.json({ status: 'error', message: 'Vendor type name is required.' }, { status: 400 });
    if (name.length > 128) return Response.json({ status: 'error', message: 'Vendor type name is too long.' }, { status: 400 });
    const id = `VT_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    await query('INSERT INTO vendor_types (vendor_type_id, name, is_active) VALUES (?, ?, 1)', [id, name]);
    return Response.json({ status: 'success', data: { vendor_type_id: id, name, is_active: true } }, { status: 201 });
  } catch (error: any) {
    const duplicate = error?.code === 'ER_DUP_ENTRY';
    return Response.json({ status: 'error', message: duplicate ? 'That vendor type already exists.' : (error instanceof Error ? error.message : String(error)) }, { status: duplicate ? 409 : 500 });
  }
}
