import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getVerifiedSession, forbiddenResponse, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { resolveVendorInventoryValuation } from '@/services/adminStockService';

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminOrSupervisorRole(session.role)) return forbiddenResponse();

  try {
    const payload = await request.json();
    const result = await resolveVendorInventoryValuation(
      {
        vendor_id: payload.vendor_id,
        product_id: payload.product_id,
        approved_unit_value: payload.approved_unit_value,
        reason: payload.reason,
      },
      { userId: session.userId ?? '' },
    );
    return NextResponse.json({ status: 'success', data: result });
  } catch (error: unknown) {
    const status = error instanceof Error && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode ?? 500
      : 500;
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : String(error) },
      { status },
    );
  }
}
