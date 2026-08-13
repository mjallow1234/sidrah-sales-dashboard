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
    const dayString = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const monthStart = `${dayString.slice(0, 7)}-01`;

    const summaryQuery = `
      SELECT
        COUNT(DISTINCT vl.vendor_id) AS vendorsVisited,
        COALESCE(SUM(vl.stock_sold), 0) AS bucketsSold,
        COALESCE(SUM(vl.cash_collected), 0) AS cashCollected
      FROM visit_logs vl
      WHERE vl.date = :today
    `;

    const [summaryRows] = await dbQuery<{ vendorsVisited: string | number; bucketsSold: string | number; cashCollected: string | number }[]>(summaryQuery, { today: dayString });
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

    const lowStockQuery = `
      SELECT COUNT(DISTINCT i.vendor_id) AS lowStockVendors
      FROM inventory i
      WHERE i.current_stock <= :lowStockThreshold
    `;
    const [lowStockRows] = await dbQuery<{ lowStockVendors: string | number }[]>(lowStockQuery, { lowStockThreshold });
    const lowStockVendors = toNumber(lowStockRows[0]?.lowStockVendors ?? 0);

    const outstandingBalancesQuery = `
      SELECT COALESCE(SUM(vb.balance_owed), 0) AS outstandingBalances
      FROM vendor_balances vb
    `;
    const [balanceRows] = await dbQuery<{ outstandingBalances: string | number }[]>(outstandingBalancesQuery);
    const outstandingBalances = toNumber(balanceRows[0]?.outstandingBalances ?? 0);

    const vendorsVisited = toNumber(summary.vendorsVisited);
    const bucketsSold = toNumber(summary.bucketsSold);
    const cashCollected = toNumber(summary.cashCollected);
    const averageSalesPerVendor = vendorsVisited > 0 ? cashCollected / vendorsVisited : 0;

    const salesByRepQuery = `
      SELECT vl.sales_rep_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected, COALESCE(SUM(vl.stock_sold), 0) AS stock_sold
      FROM visit_logs vl
      GROUP BY vl.sales_rep_id
      ORDER BY cash_collected DESC
    `;
    const [salesByRepRows] = await dbQuery<Array<{ sales_rep_id: string; cash_collected: string | number; stock_sold: string | number }>>(salesByRepQuery);

    const collectionsByRepQuery = `
      SELECT vl.sales_rep_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected
      FROM visit_logs vl
      GROUP BY vl.sales_rep_id
      ORDER BY cash_collected DESC
    `;
    const [collectionsByRepRows] = await dbQuery<Array<{ sales_rep_id: string; cash_collected: string | number }>>(collectionsByRepQuery);

    const topVendorsQuery = `
      SELECT vl.vendor_id, COALESCE(SUM(vl.cash_collected), 0) AS cash_collected
      FROM visit_logs vl
      GROUP BY vl.vendor_id
      ORDER BY cash_collected DESC
      LIMIT 10
    `;
    const [topVendorRows] = await dbQuery<Array<{ vendor_id: string; cash_collected: string | number }>>(topVendorsQuery);

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
