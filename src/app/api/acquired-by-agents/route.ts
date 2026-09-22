import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { isAdminRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  try {
    const [rows] = await query<any[]>(`SELECT acquired_by_id, name, is_active, date_created
      FROM acquired_by_names WHERE is_active = 1 ORDER BY name ASC`);
    return Response.json({ status: 'success', data: rows.map((row) => ({ acquired_by_id: String(row.acquired_by_id), name: String(row.name), is_active: Boolean(row.is_active), date_added: row.date_created ? String(row.date_created) : undefined })) });
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
    if (!name) return Response.json({ status: 'error', message: 'Acquired By name is required.' }, { status: 400 });
    if (name.length > 255) return Response.json({ status: 'error', message: 'Acquired By name is too long.' }, { status: 400 });
    const [existing] = await query<any[]>('SELECT acquired_by_id FROM acquired_by_names WHERE LOWER(name) = LOWER(?) LIMIT 1', [name]);
    if (existing.length) return Response.json({ status: 'error', message: 'That Acquired By name already exists.' }, { status: 409 });
    const id = `AB_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    await query('INSERT INTO acquired_by_names (acquired_by_id, name, is_active) VALUES (?, ?, 1)', [id, name]);
    return Response.json({ status: 'success', data: { acquired_by_id: id, name, is_active: true } }, { status: 201 });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
