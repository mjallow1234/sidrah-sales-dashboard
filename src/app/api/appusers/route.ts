import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { AppUserRepository } from '@/repositories/AppUserRepository';
import { createAppUser } from '@/services/appUserService';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const query = request.nextUrl.searchParams;
    const criteria: Record<string, unknown> = {};

    const role = query.get('role');
    const status = query.get('status');
    const phone = query.get('phone');

    if (role) criteria.role = role;
    if (status) criteria.status = status;
    if (phone) criteria.phone = phone;

const repository = new AppUserRepository(getPool());
    const users = await repository.search(criteria);

    return Response.json({ status: 'success', data: users });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    const result = await createAppUser({
      ...payload,
      created_by: session.userId,
      updated_by: session.userId,
    });
    return new Response(result.text, { status: result.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
