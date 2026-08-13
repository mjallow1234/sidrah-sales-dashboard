import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function buildDateRangeForRole(sessionRole: string | undefined, query: URLSearchParams) {
  const startDate = query.get('startDate') || query.get('start_date') || undefined;
  const endDate = query.get('endDate') || query.get('end_date') || undefined;

  if (sessionRole === 'agent') {
    const today = new Date();
    const dateString = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return {
      startDate: startDate || dateString,
      endDate: endDate || dateString,
    };
  }

  return {
    startDate,
    endDate,
  };
}

function buildVisitFilters(query: URLSearchParams, sessionRole: string | undefined, sessionSalesRepId?: string) {
  const vendorId = query.get('vendorId') || query.get('vendor_id') || undefined;
  const salesRepId = query.get('salesRepId') || query.get('sales_rep_id') || undefined;
  const productId = query.get('productId') || query.get('product_id') || undefined;
  const market = query.get('market') || undefined;
  const { startDate, endDate } = buildDateRangeForRole(sessionRole, query);

  const filters: string[] = [];
  const params: Record<string, unknown> = {};

  if (sessionRole === 'agent' && sessionSalesRepId) {
    filters.push('vl.sales_rep_id = :session_sales_rep_id');
    params.session_sales_rep_id = sessionSalesRepId;
  }

  if (vendorId) {
    filters.push('vl.vendor_id = :vendor_id');
    params.vendor_id = vendorId;
  }

  if (salesRepId) {
    filters.push('vl.sales_rep_id = :sales_rep_id');
    params.sales_rep_id = salesRepId;
  }

  if (productId) {
    filters.push('vl.product_id = :product_id');
    params.product_id = productId;
  }

  if (market) {
    filters.push('LOWER(v.location) = LOWER(:market)');
    params.market = market;
  }

  if (startDate) {
    filters.push('vl.date >= :startDate');
    params.startDate = startDate;
  }

  if (endDate) {
    filters.push('vl.date <= :endDate');
    params.endDate = endDate;
  }

  return {
    filters,
    params,
    joinClause: market ? 'INNER JOIN vendors v ON v.vendor_id = vl.vendor_id' : '',
  };
}

function buildVendorFilters(
  query: URLSearchParams,
  sessionRole: string | undefined,
  sessionSalesRepId?: string,
  tableAlias = ''
) {
  const vendorId = query.get('vendorId') || query.get('vendor_id') || undefined;
  const salesRepId = query.get('salesRepId') || query.get('sales_rep_id') || undefined;
  const market = query.get('market') || undefined;
  const prefix = tableAlias ? `${tableAlias}.` : '';

  const filters: string[] = [];
  const params: Record<string, unknown> = {};

  if (sessionRole === 'agent' && sessionSalesRepId) {
    filters.push(`${prefix}sales_rep_id = :session_sales_rep_id`);
    params.session_sales_rep_id = sessionSalesRepId;
  }

  if (vendorId) {
    filters.push(`${prefix}vendor_id = :vendor_id`);
    params.vendor_id = vendorId;
  }

  if (salesRepId) {
    filters.push(`${prefix}sales_rep_id = :sales_rep_id`);
    params.sales_rep_id = salesRepId;
  }

  if (market) {
    filters.push(`LOWER(${prefix}location) = LOWER(:market)`);
    params.market = market;
  }

  return { filters, params };
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const query = request.nextUrl.searchParams;
    const dayString = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const monthStart = `${dayString.slice(0, 7)}-01`;
    const { filters, params, joinClause } = buildVisitFilters(query, session.role, session.sales_rep_id);
    const vendorFilters = buildVendorFilters(query, session.role, session.sales_rep_id);
    const vendorJoinFilters = buildVendorFilters(query, session.role, session.sales_rep_id, 'v');

    const visitWhere = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const vendorWhere = vendorFilters.filters.length > 0 ? `WHERE ${vendorFilters.filters.join(' AND ')}` : '';
    const vendorFilterClause = vendorWhere || 'WHERE 1 = 1';

    const summaryQuery = `
      SELECT
        COUNT(DISTINCT vl.vendor_id) AS vendorsVisited,
        COALESCE(SUM(vl.stock_sold), 0) AS bucketsSold,
        COALESCE(SUM(vl.cash_collected), 0) AS cashCollected
      FROM visit_logs vl
      ${joinClause}
      ${visitWhere}
    `;

    const [summaryRows] = await dbQuery<{ vendorsVisited: string | number; bucketsSold: string | number; cashCollected: string | number }[]>(summaryQuery, params);
    const summary = summaryRows[0] ?? { vendorsVisited: 0, bucketsSold: 0, cashCollected: 0 };

    const totalActiveVendorsQuery = `
      SELECT COUNT(*) AS totalActiveVendors
      FROM vendors
      ${vendorWhere ? `${vendorWhere} AND status = 'active'` : "WHERE status = 'active'"}
    `;
    const [activeRows] = await dbQuery<{ totalActiveVendors: string | number }[]>(totalActiveVendorsQuery, vendorFilters.params);
    const totalActiveVendors = toNumber(activeRows[0]?.totalActiveVendors ?? 0);

    const newVendorsQuery = `
      SELECT COUNT(*) AS newVendorsThisMonth
      FROM vendors
      ${vendorWhere ? `${vendorWhere} AND date_created >= :monthStart AND date_created <= :today` : 'WHERE date_created >= :monthStart AND date_created <= :today'}
    `;
    const [newVendorRows] = await dbQuery<{ newVendorsThisMonth: string | number }[]>(newVendorsQuery, {
      ...vendorFilters.params,
      monthStart,
      today: dayString,
    });
    const newVendorsThisMonth = toNumber(newVendorRows[0]?.newVendorsThisMonth ?? 0);

    const thresholdRow = await dbQuery<{ setting_value: string | number | null }[]>(
      "SELECT CAST(COALESCE(setting_value, '5') AS DECIMAL(10,2)) AS setting_value FROM system_settings WHERE setting_key = 'low_stock_threshold' LIMIT 1",
      []
    );
    const lowStockThreshold = toNumber(thresholdRow[0]?.[0]?.setting_value ?? 5, 5);

    const lowStockQuery = `
      SELECT COUNT(DISTINCT i.vendor_id) AS lowStockVendors
      FROM inventory i
      ${vendorJoinFilters.filters.length > 0 ? 'INNER JOIN vendors v ON v.vendor_id = i.vendor_id' : ''}
      ${vendorJoinFilters.filters.length > 0 ? `WHERE ${vendorJoinFilters.filters.join(' AND ')} AND i.current_stock <= :lowStockThreshold` : 'WHERE i.current_stock <= :lowStockThreshold'}
    `;
    const [lowStockRows] = await dbQuery<{ lowStockVendors: string | number }[]>(lowStockQuery, {
      ...vendorJoinFilters.params,
      lowStockThreshold,
    });
    const lowStockVendors = toNumber(lowStockRows[0]?.lowStockVendors ?? 0);

    const outstandingBalancesQuery = `
      SELECT COALESCE(SUM(vb.balance_owed), 0) AS outstandingBalances
      FROM vendor_balances vb
      ${vendorJoinFilters.filters.length > 0 ? 'INNER JOIN vendors v ON v.vendor_id = vb.vendor_id' : ''}
      ${vendorJoinFilters.filters.length > 0 ? `WHERE ${vendorJoinFilters.filters.join(' AND ')}` : 'WHERE 1 = 1'}
    `;
    const [balanceRows] = await dbQuery<{ outstandingBalances: string | number }[]>(outstandingBalancesQuery, vendorJoinFilters.params);
    const outstandingBalances = toNumber(balanceRows[0]?.outstandingBalances ?? 0);

    const vendorsVisited = toNumber(summary.vendorsVisited);
    const bucketsSold = toNumber(summary.bucketsSold);
    const cashCollected = toNumber(summary.cashCollected);
    const averageSalesPerVendor = vendorsVisited > 0 ? cashCollected / vendorsVisited : 0;

    const salesByRepQuery = `
      SELECT vl.sales_rep_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected, COALESCE(SUM(vl.stock_sold), 0) AS stock_sold
      FROM visit_logs vl
      ${joinClause}
      ${visitWhere}
      GROUP BY vl.sales_rep_id
      ORDER BY cash_collected DESC
    `;
    const [salesByRepRows] = await dbQuery<Array<{ sales_rep_id: string; cash_collected: string | number; stock_sold: string | number }>>(salesByRepQuery, params);

    const collectionsByRepQuery = `
      SELECT vl.sales_rep_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected
      FROM visit_logs vl
      ${joinClause}
      ${visitWhere}
      GROUP BY vl.sales_rep_id
      ORDER BY cash_collected DESC
    `;
    const [collectionsByRepRows] = await dbQuery<Array<{ sales_rep_id: string; cash_collected: string | number }>>(collectionsByRepQuery, params);

    const topVendorsQuery = `
      SELECT vl.vendor_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected
      FROM visit_logs vl
      ${joinClause}
      ${visitWhere}
      GROUP BY vl.vendor_id
      ORDER BY cash_collected DESC
      LIMIT 10
    `;
    const [topVendorRows] = await dbQuery<Array<{ vendor_id: string; cash_collected: string | number }>>(topVendorsQuery, params);

    const stats = {
      totalActiveVendors,
      newVendorsThisMonth,
      newVendorsInRange: newVendorsThisMonth,
      vendorsVisitedToday: vendorsVisited,
      vendorsVisited,
      bucketsSoldToday: bucketsSold,
      bucketsSold,
      cashCollectedToday: cashCollected,
      cashCollected,
      outstandingBalances,
      lowStockVendors,
      averageSalesPerVendor,
      salesBySalesRep: salesByRepRows.map((row) => ({
        sales_rep_id: String(row.sales_rep_id),
        cash_collected: toNumber(row.cash_collected),
        stock_sold: toNumber(row.stock_sold),
      })),
      collectionsBySalesRep: collectionsByRepRows.map((row) => ({
        sales_rep_id: String(row.sales_rep_id),
        cash_collected: toNumber(row.cash_collected),
      })),
      top10VendorsBySales: topVendorRows.map((row) => ({
        vendor_id: String(row.vendor_id),
        cash_collected: toNumber(row.cash_collected),
      })),
    };

    return Response.json({ status: 'success', data: stats });
  } catch (error: unknown) {
    return Response.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
