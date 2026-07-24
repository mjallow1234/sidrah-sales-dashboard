import type { NextRequest } from 'next/server';
import { fetchAppUserByPhone } from '@/services/appUserService';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const segments = requestUrl.pathname.split('/').filter(Boolean);
  const phone = segments.at(-1) ?? '';

  if (!phone) {
    return new Response(JSON.stringify({ status: 'error', message: 'Phone number is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const matchingUser = await fetchAppUserByPhone(phone);
    return new Response(JSON.stringify({ status: 'success', data: matchingUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ status: 'error', message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
