import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('sidrah_session')?.value;

  if (!token) {
    return NextResponse.json({ valid: false });
  }

  const verification = await verifySession(token);
  return NextResponse.json(verification);
}
