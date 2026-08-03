import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/session';
import { fetchAppUserById } from '@/services/appUserService';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('sidrah_session')?.value;

  if (!token) {
    return NextResponse.json({ valid: false });
  }

  const verification = await verifySession(token);
  if (!verification.valid || !verification.userId) {
    return NextResponse.json(verification);
  }

  if (!verification.name || !verification.display_name || !verification.full_name || !verification.username) {
    const userResult = await fetchAppUserById(verification.userId);
    if (userResult.ok) {
      const userPayload = typeof userResult.payload === 'object' && userResult.payload !== null ? (userResult.payload as any).data ?? null : null;
      if (userPayload) {
        verification.name = verification.name || userPayload.name || userPayload.full_name || userPayload.username || undefined;
        verification.username = verification.username || userPayload.username || undefined;
        verification.display_name = verification.display_name || userPayload.display_name || userPayload.name || userPayload.username || undefined;
        verification.full_name = verification.full_name || userPayload.full_name || userPayload.name || userPayload.username || undefined;
      }
    }
  }

  return NextResponse.json(verification);
}
