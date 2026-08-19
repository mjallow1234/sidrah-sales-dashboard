import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { AppUserRepository } from '@/repositories/AppUserRepository';
import { updateAppUser } from '@/services/appUserService';
import { getPool } from '@/lib/db';

function getIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] || '';
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  const id = getIdFromUrl(request);
  if (session.userId !== id && !isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const repository = new AppUserRepository(getPool());
    const user = await repository.findById(id);
    return Response.json({ status: 'success', data: user });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return Response.json({ status: 'error', message: error.message }, { status: 404 });
    }
    return Response.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  const id = getIdFromUrl(request);
  const payload = await request.json();
  const updateResult = await updateAppUser(id, payload);
  return new Response(updateResult.text, { status: updateResult.status, headers: { 'Content-Type': 'application/json' } });
}
