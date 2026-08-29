import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
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
    const startDate = query.get('startDate') || query.get('start_date');
    const endDate = query.get('endDate') || query.get('end_date');
    const vendorId = query.get('vendorId') || query.get('vendor_id');
    const salesRepId = query.get('salesRepId') || query.get('sales_rep_id');
    const productId = query.get('productId') || query.get('product_id');
    const market = query.get('market');

    const visitFilters: string[] = [];
    const visitParams: Record<string, unknown> = {};

    if (vendorId) {
      visitFilters.push('vl.vendor_id = :vendor_id');
      visitParams.vendor_id = vendorId;
    }
    if (salesRepId) {
      visitFilters.push('vl.sales_rep_id = :sales_rep_id');
      visitParams.sales_rep_id = salesRepId;
    }
    if (productId) {
      visitFilters.push('vl.product_id = :product_id');
      visitParams.product_id = productId;
    }
    if (startDate) {
      visitFilters.push('vl.date >= :startDate');
      visitParams.startDate = startDate;
    }
    if (endDate) {
      visitFilters.push('vl.date <= :endDate');
      visitParams.endDate = endDate;
    }
    const visitJoinClause = market ? 'INNER JOIN vendors v ON v.vendor_id = vl.vendor_id' : '';
    if (market) {
      visitFilters.push('v.location = :market');
      visitParams.market = market;
    }

    visitFilters.push('COALESCE(vl.is_reversed, 0) = 0');

    if (!startDate && !endDate) {
      visitFilters.push('vl.date = :summaryToday');
      visitParams.summaryToday = dayString;
    }

    const visitWhereClause = visitFilters.length > 0 ? `WHERE ${visitFilters.join(' AND ')}` : '';
    const summaryQuery = `
      SELECT
        COUNT(DISTINCT vl.vendor_id) AS vendorsVisited,
        COALESCE(SUM(vl.stock_sold), 0) AS bucketsSold,
        COALESCE(SUM(vl.cash_collected), 0) AS cashCollected
      FROM visit_logs vl
      ${visitJoinClause}
      ${visitWhereClause}
    `;

    const [summaryRows] = await dbQuery<{ vendorsVisited: string | number; bucketsSold: string | number; cashCollected: string | number }[]>(summaryQuery, visitParams);
    const summary = summaryRows[0] ?? { vendorsVisited: 0, bucketsSold: 0, cashCollected: 0 };

    const totalActiveVendorsQuery = `
      SELECT COUNT(*) AS totalActiveVendors
      FROM vendors
      WHERE status = 'active'
    `;
    const [activeRows] = await dbQuery<{ totalActiveVendors: string | number }[]>(totalActiveVendorsQuery);
    const totalActiveVendors = toNumber(activeRows[0]?.totalActiveVendors ?? 0);

    const newVendorsQuery = `
      SELECT COUNT(*) AS newVendorsThisMonth
      FROM vendors
      WHERE date_created >= :monthStart
        AND date_created <= :today
    `;
    const [newVendorRows] = await dbQuery<{ newVendorsThisMonth: string | number }[]>(newVendorsQuery, { monthStart, today: dayString });
    const newVendorsThisMonth = toNumber(newVendorRows[0]?.newVendorsThisMonth ?? 0);

    const thresholdRow = await dbQuery<{ setting_value: string | number | null }[]>(
      "SELECT CAST(COALESCE(setting_value, '5') AS DECIMAL(10,2)) AS setting_value FROM system_settings WHERE setting_key = 'low_stock_threshold' LIMIT 1",
      []
    );
    const lowStockThreshold = toNumber(thresholdRow[0]?.[0]?.setting_value ?? 5, 5);

    const lowStockFilters: string[] = ['i.current_stock <= :lowStockThreshold'];
    const lowStockParams: Record<string, unknown> = { lowStockThreshold };
    const lowStockJoinClause = market ? 'INNER JOIN vendors v ON v.vendor_id = i.vendor_id' : '';

    if (vendorId) {
      lowStockFilters.push('i.vendor_id = :vendor_id');
      lowStockParams.vendor_id = vendorId;
    }
    if (productId) {
      lowStockFilters.push('i.product_id = :product_id');
      lowStockParams.product_id = productId;
    }
    if (market) {
      lowStockFilters.push('v.location = :market');
      lowStockParams.market = market;
    }

    const lowStockWhereClause = lowStockFilters.length > 0 ? `WHERE ${lowStockFilters.join(' AND ')}` : '';
    const lowStockQuery = `
      SELECT COUNT(DISTINCT i.vendor_id) AS lowStockVendors
      FROM inventory i
      ${lowStockJoinClause}
      ${lowStockWhereClause}
    `;
    const [lowStockRows] = await dbQuery<{ lowStockVendors: string | number }[]>(lowStockQuery, lowStockParams);
    const lowStockVendors = toNumber(lowStockRows[0]?.lowStockVendors ?? 0);

    const stockFilters: string[] = [];
    const stockParams: Record<string, unknown> = {};
    const stockJoinClause = market || salesRepId ? 'INNER JOIN vendors v ON v.vendor_id = vi.vendor_id' : '';

    if (vendorId) {
      stockFilters.push('vi.vendor_id = :vendor_id');
      stockParams.vendor_id = vendorId;
    }
    if (productId) {
      stockFilters.push('vi.product_id = :product_id');
      stockParams.product_id = productId;
    }
    if (market) {
      stockFilters.push('v.location = :market');
      stockParams.market = market;
    }
    if (salesRepId) {
      stockFilters.push('v.sales_rep_id = :sales_rep_id');
      stockParams.sales_rep_id = salesRepId;
    }

    const stockWhereClause = stockFilters.length > 0 ? `WHERE ${stockFilters.join(' AND ')}` : '';
    const totalBucketsOutThereQuery = `
      SELECT COALESCE(SUM(vi.current_stock), 0) AS totalBucketsOutThere
      FROM vendor_inventory vi
      ${stockJoinClause}
      ${stockWhereClause}
    `;
    const [stockRows] = await dbQuery<Array<{ totalBucketsOutThere: string | number }>>(totalBucketsOutThereQuery, stockParams);
    const totalBucketsOutThere = toNumber(stockRows[0]?.totalBucketsOutThere ?? 0);

    const productBreakdownQuery = `
      SELECT p.product_name AS productName, COALESCE(SUM(vi.current_stock), 0) AS quantity
      FROM vendor_inventory vi
      JOIN products p ON p.product_id = vi.product_id
      ${stockJoinClause}
      ${stockWhereClause}
      GROUP BY p.product_id, p.product_name
      HAVING COALESCE(SUM(vi.current_stock), 0) > 0
      ORDER BY quantity DESC, p.product_name ASC
    `;
    const [productBreakdownRows] = await dbQuery<Array<{ productName: string; quantity: string | number }>>(productBreakdownQuery, stockParams);
    const totalBucketsOutThereByProduct = productBreakdownRows.map((row) => ({
      productName: String(row.productName),
      quantity: toNumber(row.quantity),
    }));

    const balanceFilters: string[] = [];
    const balanceParams: Record<string, unknown> = {};
    const balanceJoinClause = market ? 'INNER JOIN vendors v ON v.vendor_id = vb.vendor_id' : '';

    if (vendorId) {
      balanceFilters.push('vb.vendor_id = :vendor_id');
      balanceParams.vendor_id = vendorId;
    }
    if (market) {
      balanceFilters.push('v.location = :market');
      balanceParams.market = market;
    }

    const amountOwedFilters: string[] = [];
    const amountOwedParams: Record<string, unknown> = {};
    const amountOwedJoinClause = market || salesRepId ? 'INNER JOIN vendors v ON v.vendor_id = vi.vendor_id' : '';

    if (vendorId) {
      amountOwedFilters.push('vi.vendor_id = :vendor_id');
      amountOwedParams.vendor_id = vendorId;
    }
    if (salesRepId) {
      amountOwedFilters.push('v.sales_rep_id = :sales_rep_id');
      amountOwedParams.sales_rep_id = salesRepId;
    }
    if (productId) {
      amountOwedFilters.push('vi.product_id = :product_id');
      amountOwedParams.product_id = productId;
    }
    if (market) {
      amountOwedFilters.push('v.location = :market');
      amountOwedParams.market = market;
    }

    const amountOwedWhereClause = amountOwedFilters.length > 0 ? `WHERE ${amountOwedFilters.join(' AND ')}` : '';
    const netSuppliedValueQuery = `
      SELECT
        COALESCE(SUM(
          (COALESCE(vi.total_stock_received, 0) - COALESCE(ar.retrieved_quantity, 0))
          * COALESCE(p.default_unit_price, 0)
        ), 0) AS netSuppliedValue
      FROM vendor_inventory vi
      LEFT JOIN products p ON p.product_id = vi.product_id
      LEFT JOIN (
        SELECT source_vendor_id AS vendor_id, product_id, COALESCE(SUM(quantity), 0) AS retrieved_quantity
        FROM admin_stock_movements
        WHERE movement_type = 'retrieval'
        GROUP BY source_vendor_id, product_id
      ) ar ON ar.vendor_id = vi.vendor_id AND ar.product_id = vi.product_id
      ${amountOwedJoinClause}
      ${amountOwedWhereClause}
    `;
    const [netSuppliedRows] = await dbQuery<Array<{ netSuppliedValue: string | number }>>(netSuppliedValueQuery, amountOwedParams);
    const netSuppliedValue = toNumber(netSuppliedRows[0]?.netSuppliedValue ?? 0);

    const activeCashFilters: string[] = ['COALESCE(vl.is_reversed, 0) = 0'];
    const activeCashParams: Record<string, unknown> = {};
    const activeCashJoinClause = market || salesRepId ? 'INNER JOIN vendors v ON v.vendor_id = vl.vendor_id' : '';

    if (vendorId) {
      activeCashFilters.push('vl.vendor_id = :vendor_id');
      activeCashParams.vendor_id = vendorId;
    }
    if (salesRepId) {
      activeCashFilters.push('vl.sales_rep_id = :sales_rep_id');
      activeCashParams.sales_rep_id = salesRepId;
    }
    if (productId) {
      activeCashFilters.push('vl.product_id = :product_id');
      activeCashParams.product_id = productId;
    }
    if (market) {
      activeCashFilters.push('v.location = :market');
      activeCashParams.market = market;
    }

    const activeCashWhereClause = activeCashFilters.length > 0 ? `WHERE ${activeCashFilters.join(' AND ')}` : '';
    const activeCashQuery = `
      SELECT COALESCE(SUM(vl.cash_collected), 0) AS activeCash
      FROM visit_logs vl
      ${activeCashJoinClause}
      ${activeCashWhereClause}
    `;
    const [activeCashRows] = await dbQuery<Array<{ activeCash: string | number }>>(activeCashQuery, activeCashParams);
    const activeCash = toNumber(activeCashRows[0]?.activeCash ?? 0);
    const totalAmountOwed = netSuppliedValue - activeCash;

    const balanceWhereClause = balanceFilters.length > 0 ? `WHERE ${balanceFilters.join(' AND ')}` : '';
    const balanceSummaryQuery = `
      SELECT
        COALESCE(SUM(vb.balance_owed), 0) AS outstandingBalances,
        COALESCE(SUM(CASE WHEN vb.balance_owed > 0 THEN vb.balance_owed ELSE 0 END), 0) AS totalVendorReceivables,
        COALESCE(SUM(CASE WHEN vb.balance_owed < 0 THEN ABS(vb.balance_owed) ELSE 0 END), 0) AS vendorCredits
      FROM vendor_balances vb
      ${balanceJoinClause}
      ${balanceWhereClause}
    `;
    const [balanceRows] = await dbQuery<Array<{ outstandingBalances: string | number; totalVendorReceivables: string | number; vendorCredits: string | number }>>(balanceSummaryQuery, balanceParams);
    const outstandingBalances = toNumber(balanceRows[0]?.outstandingBalances ?? 0);
    const totalVendorReceivables = toNumber(balanceRows[0]?.totalVendorReceivables ?? 0);
    const vendorCredits = toNumber(balanceRows[0]?.vendorCredits ?? 0);

    const vendorsVisited = toNumber(summary.vendorsVisited);
    const bucketsSold = toNumber(summary.bucketsSold);
    const cashCollected = toNumber(summary.cashCollected);
    const averageSalesPerVendor = vendorsVisited > 0 ? cashCollected / vendorsVisited : 0;

    const salesByRepQuery = `
      SELECT vl.sales_rep_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected, COALESCE(SUM(vl.stock_sold), 0) AS stock_sold
      FROM visit_logs vl
      ${visitJoinClause}
      ${visitWhereClause}
      GROUP BY vl.sales_rep_id
      ORDER BY cash_collected DESC
    `;
    const [salesByRepRows] = await dbQuery<Array<{ sales_rep_id: string; cash_collected: string | number; stock_sold: string | number }>>(salesByRepQuery, visitParams);

    const collectionsByRepQuery = `
      SELECT vl.sales_rep_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected
      FROM visit_logs vl
      ${visitJoinClause}
      ${visitWhereClause}
      GROUP BY vl.sales_rep_id
      ORDER BY cash_collected DESC
    `;
    const [collectionsByRepRows] = await dbQuery<Array<{ sales_rep_id: string; cash_collected: string | number }>>(collectionsByRepQuery, visitParams);

    const topVendorsQuery = `
      SELECT vl.vendor_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected
      FROM visit_logs vl
      ${visitJoinClause}
      ${visitWhereClause}
      GROUP BY vl.vendor_id
      ORDER BY cash_collected DESC
      LIMIT 10
    `;
    const [topVendorRows] = await dbQuery<Array<{ vendor_id: string; cash_collected: string | number }>>(topVendorsQuery, visitParams);

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
      totalBucketsOutThere,
      totalBucketsOutThereByProduct,
      outstandingBalances,
      totalAmountOwed,
      totalVendorReceivables,
      vendorCredits,
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
