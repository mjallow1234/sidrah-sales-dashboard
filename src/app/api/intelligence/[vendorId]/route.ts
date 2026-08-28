import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getVendorIntelligence } from '@/services/intelligenceService';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole, isAgentRole } from '@/lib/authorization';

function getIdFromUrl(request: NextRequest) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] || '';
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  const vendorId = getIdFromUrl(request);
  const market = request.nextUrl.searchParams.get('market') || undefined;

  try {
    const [rows] = await getPool().query<any[]>(
      'SELECT vendor_id, sales_rep_id FROM vendors WHERE vendor_id = ? LIMIT 1',
      [vendorId],
    );

    if (rows.length === 0) {
      return Response.json({ status: 'error', message: 'Vendor not found.' }, { status: 404 });
    }

    const vendor = rows[0];

    if (!isAdminOrSupervisorRole(session.role)) {
      if (isAgentRole(session.role)) {
        if (vendor.sales_rep_id !== null && vendor.sales_rep_id !== session.sales_rep_id) {
          return forbiddenResponse();
        }
      } else {
        return forbiddenResponse();
      }
    }

    const intelligence = await getVendorIntelligence(vendorId, { market });
    return Response.json({ status: 'success', data: intelligence });
  } catch (error: unknown) {
    return Response.json(
      { status: 'error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
