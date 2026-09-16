import type {
  AdminDashboardAttention,
  AdminDashboardDataQuality,
  AdminDashboardDeliverySummary,
  AdminDashboardFactoryProduct,
  AdminDashboardFactorySummary,
  AdminDashboardFilters,
  AdminDashboardFilterOptions,
  AdminDashboardLocationRow,
  AdminDashboardProductRow,
  AdminDashboardSalesRepRow,
  AdminDashboardSnapshot,
  AdminDashboardSummary,
  AdminDashboardTrendPoint,
  AdminDashboardVendorAttention,
} from '@/lib/types/admin-dashboard';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

type QueryParams = Record<string, unknown>;

interface NumberRow {
  [key: string]: string | number | null;
}

function toNumber(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeLocation(value: unknown): string {
  const text = String(value ?? '').trim();
  return text || 'Unknown location';
}

export class AdminDashboardRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  private visitConditions(filters: AdminDashboardFilters, params: QueryParams, vendorAlias = 'v'): string[] {
    const conditions = ['COALESCE(vl.is_reversed, 0) = 0'];
    conditions.push('vl.date >= :startDate');
    conditions.push('vl.date <= :endDate');
    params.startDate = filters.startDate;
    params.endDate = filters.endDate;

    if (filters.productId) {
      conditions.push('vl.product_id = :productId');
      params.productId = filters.productId;
    }
    if (filters.location) {
      conditions.push(`COALESCE(NULLIF(TRIM(${vendorAlias}.location), ''), 'Unknown location') = :location`);
      params.location = filters.location;
    }
    if (filters.salesRepId) {
      conditions.push('vl.sales_rep_id = :salesRepId');
      params.salesRepId = filters.salesRepId;
    }

    return conditions;
  }

  private vendorConditions(filters: AdminDashboardFilters, params: QueryParams, vendorAlias = 'v'): string[] {
    const conditions: string[] = [];
    if (filters.location) {
      conditions.push(`COALESCE(NULLIF(TRIM(${vendorAlias}.location), ''), 'Unknown location') = :vendorLocation`);
      params.vendorLocation = filters.location;
    }
    if (filters.salesRepId) {
      conditions.push(`${vendorAlias}.sales_rep_id = :vendorSalesRepId`);
      params.vendorSalesRepId = filters.salesRepId;
    }
    return conditions;
  }

  async getSummary(filters: AdminDashboardFilters): Promise<AdminDashboardSummary> {
    const [
      snapshot,
      trends,
      locations,
      products,
      salesReps,
      deliveries,
      factory,
      topVendorsOwing,
      vendorCredits,
      dataQuality,
      filterOptions,
    ] = await Promise.all([
      this.getSnapshot(filters),
      this.getTrends(filters),
      this.getLocations(filters),
      this.getProducts(filters),
      this.getSalesReps(filters),
      this.getDeliveries(filters),
      this.getFactory(filters),
      this.getVendorAttention(filters, 'owing'),
      this.getVendorAttention(filters, 'credit'),
      this.getDataQuality(filters),
      this.getFilterOptions(),
    ]);

    return {
      filters,
      snapshot,
      trends,
      locations,
      products,
      salesReps,
      deliveries,
      factory,
      attention: {
        topVendorsOwing,
        vendorCredits,
        unassignedDeliveries: deliveries.unassignedRequests,
        outstandingDeliveries: deliveries.outstandingRequests,
        outstandingDeliveryQuantity: deliveries.outstandingQuantity,
        lowFactoryStock: factory.lowStockProducts,
      },
      dataQuality,
      filterOptions,
    };
  }

  private async getSnapshot(filters: AdminDashboardFilters): Promise<AdminDashboardSnapshot> {
    const visitParams: QueryParams = {};
    const visitWhere = this.visitConditions(filters, visitParams).join(' AND ');
    const [visitRows] = await this.execute<Array<NumberRow>>(
      `SELECT
         COALESCE(SUM(vl.cash_collected), 0) AS cashCollected,
         COALESCE(SUM(vl.stock_added), 0) AS suppliedQuantity,
         COALESCE(SUM(vl.expected_cash), 0) AS suppliedValue,
         COUNT(*) AS visitCount,
         COUNT(DISTINCT vl.vendor_id) AS vendorsVisited
       FROM visit_logs vl
       INNER JOIN vendors v ON v.vendor_id = vl.vendor_id
       WHERE ${visitWhere}`,
      visitParams,
    );

    const vendorParams: QueryParams = {};
    const vendorConditions = this.vendorConditions(filters, vendorParams);
    const vendorWhere = vendorConditions.length > 0 ? `WHERE ${vendorConditions.join(' AND ')}` : '';
    const [receivableRows] = await this.execute<Array<NumberRow>>(
      `SELECT
         COALESCE(SUM(CASE WHEN vb.balance_owed > 0 THEN vb.balance_owed ELSE 0 END), 0) AS vendorReceivables,
         COUNT(CASE WHEN vb.balance_owed > 0 THEN 1 END) AS vendorsOwing,
         COALESCE(SUM(CASE WHEN vb.balance_owed < 0 THEN ABS(vb.balance_owed) ELSE 0 END), 0) AS vendorCredits,
         COUNT(CASE WHEN vb.balance_owed < 0 THEN 1 END) AS vendorsInCredit
       FROM vendor_balances vb
       INNER JOIN vendors v ON v.vendor_id = vb.vendor_id
       ${vendorWhere}`,
      vendorParams,
    );

    const deliveries = await this.getDeliveries(filters);
    const factory = await this.getFactory(filters);
    const visit = visitRows[0] ?? {};
    const receivables = receivableRows[0] ?? {};

    return {
      period: {
        cashCollected: toNumber(visit.cashCollected),
        suppliedQuantity: toNumber(visit.suppliedQuantity),
        suppliedValue: toNumber(visit.suppliedValue),
        visitCount: toNumber(visit.visitCount),
        vendorsVisited: toNumber(visit.vendorsVisited),
      },
      current: {
        vendorReceivables: toNumber(receivables.vendorReceivables),
        vendorsOwing: toNumber(receivables.vendorsOwing),
        vendorCredits: toNumber(receivables.vendorCredits),
        vendorsInCredit: toNumber(receivables.vendorsInCredit),
        outstandingDeliveryRequests: deliveries.outstandingRequests,
        outstandingDeliveryQuantity: deliveries.outstandingQuantity,
        factoryFinishedStock: factory.finishedStockQuantity,
      },
    };
  }

  private async getTrends(filters: AdminDashboardFilters): Promise<AdminDashboardTrendPoint[]> {
    const params: QueryParams = {};
    const where = this.visitConditions(filters, params).join(' AND ');
    const [rows] = await this.execute<Array<NumberRow & { date: string }>>(
      `SELECT
         vl.date AS date,
         COALESCE(SUM(vl.cash_collected), 0) AS cashCollected,
         COALESCE(SUM(vl.stock_added), 0) AS suppliedQuantity,
         COALESCE(SUM(vl.expected_cash), 0) AS suppliedValue
       FROM visit_logs vl
       INNER JOIN vendors v ON v.vendor_id = vl.vendor_id
       WHERE ${where}
       GROUP BY vl.date
       ORDER BY vl.date ASC`,
      params,
    );

    return rows.map((row) => ({
      date: String(row.date).slice(0, 10),
      cashCollected: toNumber(row.cashCollected),
      suppliedQuantity: toNumber(row.suppliedQuantity),
      suppliedValue: toNumber(row.suppliedValue),
    }));
  }

  private async getLocations(filters: AdminDashboardFilters): Promise<AdminDashboardLocationRow[]> {
    const params: QueryParams = {};
    const where = this.visitConditions(filters, params).join(' AND ');
    if (filters.location) params.activeVendorLocation = filters.location;
    if (filters.salesRepId) params.activeVendorSalesRepId = filters.salesRepId;

    const [rows] = await this.execute<Array<NumberRow & { location: string }>>(
      `SELECT
         location_activity.location,
         location_activity.suppliedQuantity,
         location_activity.suppliedValue,
         location_activity.cashCollected,
         COALESCE(active_vendor_counts.activeVendors, 0) AS activeVendors
       FROM (
         SELECT
           COALESCE(NULLIF(TRIM(v.location), ''), 'Unknown location') AS location,
           COALESCE(SUM(vl.stock_added), 0) AS suppliedQuantity,
           COALESCE(SUM(vl.expected_cash), 0) AS suppliedValue,
           COALESCE(SUM(vl.cash_collected), 0) AS cashCollected
         FROM visit_logs vl
         INNER JOIN vendors v ON v.vendor_id = vl.vendor_id
         WHERE ${where}
         GROUP BY COALESCE(NULLIF(TRIM(v.location), ''), 'Unknown location')
       ) AS location_activity
       LEFT JOIN (
         SELECT
           COALESCE(NULLIF(TRIM(av.location), ''), 'Unknown location') AS location,
           COUNT(*) AS activeVendors
         FROM vendors av
         WHERE av.status = 'active'
           ${filters.location ? "AND COALESCE(NULLIF(TRIM(av.location), ''), 'Unknown location') = :activeVendorLocation" : ''}
           ${filters.salesRepId ? 'AND av.sales_rep_id = :activeVendorSalesRepId' : ''}
         GROUP BY COALESCE(NULLIF(TRIM(av.location), ''), 'Unknown location')
       ) AS active_vendor_counts ON active_vendor_counts.location = location_activity.location
       ORDER BY location_activity.suppliedQuantity DESC, location_activity.cashCollected DESC
       LIMIT 12`,
      params,
    );

    return rows.map((row) => ({
      location: normalizeLocation(row.location),
      suppliedQuantity: toNumber(row.suppliedQuantity),
      suppliedValue: toNumber(row.suppliedValue),
      cashCollected: toNumber(row.cashCollected),
      activeVendors: toNumber(row.activeVendors),
    }));
  }

  private async getProducts(filters: AdminDashboardFilters): Promise<AdminDashboardProductRow[]> {
    const params: QueryParams = {};
    const where = this.visitConditions(filters, params).join(' AND ');
    const [rows] = await this.execute<Array<NumberRow & { productId: string; productName: string; unit: string }>>(
      `SELECT
         p.product_id AS productId,
         p.product_name AS productName,
         p.unit AS unit,
         COALESCE(SUM(vl.stock_added), 0) AS suppliedQuantity,
         COALESCE(SUM(vl.expected_cash), 0) AS suppliedValue,
         COALESCE(SUM(vl.cash_collected), 0) AS cashCollected
       FROM visit_logs vl
       INNER JOIN vendors v ON v.vendor_id = vl.vendor_id
       INNER JOIN products p ON p.product_id = vl.product_id
       WHERE ${where}
       GROUP BY p.product_id, p.product_name, p.unit
       ORDER BY suppliedQuantity DESC, suppliedValue DESC, p.product_name ASC
       LIMIT 12`,
      params,
    );

    return rows.map((row) => ({
      productId: String(row.productId),
      productName: String(row.productName),
      unit: String(row.unit),
      suppliedQuantity: toNumber(row.suppliedQuantity),
      suppliedValue: toNumber(row.suppliedValue),
      cashCollected: toNumber(row.cashCollected),
    }));
  }

  private async getSalesReps(filters: AdminDashboardFilters): Promise<AdminDashboardSalesRepRow[]> {
    const params: QueryParams = {};
    const where = this.visitConditions(filters, params).join(' AND ');
    const [rows] = await this.execute<Array<NumberRow & { salesRepId: string | null; salesRepName: string | null }>>(
      `SELECT
         vl.sales_rep_id AS salesRepId,
         sr.name AS salesRepName,
         COUNT(*) AS visits,
         COUNT(DISTINCT vl.vendor_id) AS vendorsVisited,
         COALESCE(SUM(vl.stock_added), 0) AS suppliedQuantity,
         COALESCE(SUM(vl.expected_cash), 0) AS suppliedValue,
         COALESCE(SUM(vl.cash_collected), 0) AS cashCollected
       FROM visit_logs vl
       INNER JOIN vendors v ON v.vendor_id = vl.vendor_id
       LEFT JOIN sales_reps sr ON sr.sales_rep_id = vl.sales_rep_id
       WHERE ${where}
       GROUP BY vl.sales_rep_id, sr.name
       ORDER BY cashCollected DESC, suppliedQuantity DESC
       LIMIT 12`,
      params,
    );

    return rows.map((row) => {
      const hasIdentity = Boolean(row.salesRepId && row.salesRepName);
      return {
        salesRepId: row.salesRepId ? String(row.salesRepId) : undefined,
        salesRepName: hasIdentity ? String(row.salesRepName) : 'Actor unavailable - historical record',
        visits: toNumber(row.visits),
        vendorsVisited: toNumber(row.vendorsVisited),
        suppliedQuantity: toNumber(row.suppliedQuantity),
        suppliedValue: toNumber(row.suppliedValue),
        cashCollected: toNumber(row.cashCollected),
        hasUnresolvedIdentity: !hasIdentity,
      };
    });
  }

  private async getDeliveries(filters: AdminDashboardFilters): Promise<AdminDashboardDeliverySummary> {
    const productCondition = filters.productId ? 'AND item.product_id = :deliveryProductId' : '';
    const params: QueryParams = filters.productId ? { deliveryProductId: filters.productId } : {};
    const [rows] = await this.execute<Array<NumberRow>>(
      `SELECT
         COUNT(DISTINCT d.delivery_id) AS outstandingRequests,
         COALESCE(SUM(item.quantity), 0) AS outstandingQuantity,
         COUNT(DISTINCT CASE WHEN d.status = 'pending' AND d.claimed_by IS NULL THEN d.delivery_id END) AS unassignedRequests
       FROM deliveries d
       JOIN JSON_TABLE(
         d.items,
         '$[*]' COLUMNS (
           product_id VARCHAR(64) PATH '$.product_id',
           quantity DECIMAL(18, 3) PATH '$.quantity'
         )
       ) AS item ON TRUE
       WHERE d.status IN ('pending', 'ongoing')
       ${productCondition}`,
      params,
    );
    const row = rows[0] ?? {};
    return {
      outstandingRequests: toNumber(row.outstandingRequests),
      outstandingQuantity: toNumber(row.outstandingQuantity),
      unassignedRequests: toNumber(row.unassignedRequests),
    };
  }

  private async getFactory(filters: AdminDashboardFilters): Promise<AdminDashboardFactorySummary> {
    const productCurrentCondition = filters.productId ? 'AND p.product_id = :factoryProductId' : '';
    const productParams: QueryParams = filters.productId ? { factoryProductId: filters.productId } : {};
    const [inventoryRows] = await this.execute<Array<NumberRow & { productId: string; productName: string; unit: string }>>(
      `SELECT
         p.product_id AS productId,
         p.product_name AS productName,
         p.unit AS unit,
         COALESCE(fi.current_quantity, 0) AS currentQuantity
       FROM products p
       LEFT JOIN factory_inventory fi ON fi.product_id = p.product_id
       WHERE p.active = TRUE
       ${productCurrentCondition}
       ORDER BY p.product_name ASC`,
      productParams,
    );

    const products = inventoryRows.map((row) => ({
      productId: String(row.productId),
      productName: String(row.productName),
      unit: String(row.unit),
      currentQuantity: toNumber(row.currentQuantity),
    }));

    const movementParams: QueryParams = { startDateTime: `${filters.startDate} 00:00:00`, endDateTime: `${filters.endDate} 23:59:59` };
    const movementConditions = ['e.status = \'active\'', 'e.occurred_at >= :startDateTime', 'e.occurred_at <= :endDateTime'];
    if (filters.productId) {
      movementConditions.push('m.product_id = :factoryMovementProductId');
      movementParams.factoryMovementProductId = filters.productId;
    }
    const [movementRows] = await this.execute<Array<NumberRow>>(
      `SELECT
         COALESCE(SUM(CASE WHEN e.movement_type = 'production' THEN m.quantity ELSE 0 END), 0) AS productionQuantity,
         COALESCE(SUM(CASE WHEN e.movement_type = 'leaving_factory' THEN m.quantity ELSE 0 END), 0) AS outflowQuantity
       FROM factory_movement_events e
       INNER JOIN factory_stock_movements m ON m.event_id = e.event_id
       WHERE ${movementConditions.join(' AND ')}`,
      movementParams,
    );

    const [lowRows] = await this.execute<Array<NumberRow & { productId: string; productName: string; unit: string }>>(
      `SELECT
         p.product_id AS productId,
         p.product_name AS productName,
         p.unit AS unit,
         COALESCE(fi.current_quantity, 0) AS currentQuantity
       FROM products p
       LEFT JOIN factory_inventory fi ON fi.product_id = p.product_id
       WHERE p.active = TRUE
         AND p.low_stock_threshold > 0
         AND COALESCE(fi.current_quantity, 0) <= p.low_stock_threshold
         ${filters.productId ? 'AND p.product_id = :lowStockProductId' : ''}
       ORDER BY COALESCE(fi.current_quantity, 0) ASC, p.product_name ASC
       LIMIT 8`,
      filters.productId ? { lowStockProductId: filters.productId } : {},
    );

    const movement = movementRows[0] ?? {};
    return {
      finishedStockQuantity: products.reduce((sum, item) => sum + item.currentQuantity, 0),
      products,
      productionQuantity: toNumber(movement.productionQuantity),
      outflowQuantity: toNumber(movement.outflowQuantity),
      lowStockProducts: lowRows.map((row) => ({
        productId: String(row.productId),
        productName: String(row.productName),
        unit: String(row.unit),
        currentQuantity: toNumber(row.currentQuantity),
      })),
    };
  }

  private async getVendorAttention(filters: AdminDashboardFilters, mode: 'owing' | 'credit'): Promise<AdminDashboardVendorAttention[]> {
    const params: QueryParams = {};
    const conditions = this.vendorConditions(filters, params);
    conditions.push(mode === 'owing' ? 'vb.balance_owed > 0' : 'vb.balance_owed < 0');
    const [rows] = await this.execute<Array<NumberRow & { vendorId: string; vendorName: string; location: string }>>(
      `SELECT
         v.vendor_id AS vendorId,
         v.vendor_name AS vendorName,
         COALESCE(NULLIF(TRIM(v.location), ''), 'Unknown location') AS location,
         ${mode === 'owing' ? 'vb.balance_owed' : 'ABS(vb.balance_owed)'} AS amount
       FROM vendor_balances vb
       INNER JOIN vendors v ON v.vendor_id = vb.vendor_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY amount DESC, v.vendor_name ASC
       LIMIT 8`,
      params,
    );

    return rows.map((row) => ({
      vendorId: String(row.vendorId),
      vendorName: String(row.vendorName),
      location: normalizeLocation(row.location),
      amount: toNumber(row.amount),
    }));
  }

  private async getDataQuality(filters: AdminDashboardFilters): Promise<AdminDashboardDataQuality> {
    const params: QueryParams = { startDate: filters.startDate, endDate: filters.endDate };
    if (filters.productId) params.productId = filters.productId;
    if (filters.location) params.location = filters.location;
    if (filters.salesRepId) params.salesRepId = filters.salesRepId;

    const [unknownLocationRows] = await this.execute<Array<NumberRow>>(
      "SELECT COUNT(*) AS count FROM vendors WHERE status = 'active' AND NULLIF(TRIM(location), '') IS NULL",
    );

    const visitParams: QueryParams = {};
    const visitWhere = this.visitConditions(filters, visitParams).join(' AND ');
    const [missingActorRows] = await this.execute<Array<NumberRow>>(
      `SELECT COUNT(*) AS count
       FROM visit_logs vl
       INNER JOIN vendors v ON v.vendor_id = vl.vendor_id
       LEFT JOIN sales_reps sr ON sr.sales_rep_id = vl.sales_rep_id
       WHERE ${visitWhere}
         AND (sr.sales_rep_id IS NULL OR vl.created_by IS NULL OR vl.created_by = '')`,
      visitParams,
    );
    const [reversedRows] = await this.execute<Array<NumberRow>>(
      `SELECT COUNT(*) AS count
       FROM visit_logs vl
       INNER JOIN vendors v ON v.vendor_id = vl.vendor_id
       WHERE vl.date >= :startDate
         AND vl.date <= :endDate
         AND COALESCE(vl.is_reversed, 0) = 1
         ${filters.productId ? 'AND vl.product_id = :productId' : ''}
         ${filters.location ? "AND COALESCE(NULLIF(TRIM(v.location), ''), 'Unknown location') = :location" : ''}
         ${filters.salesRepId ? 'AND vl.sales_rep_id = :salesRepId' : ''}`,
      params,
    );

    return {
      unknownLocationVendors: toNumber(unknownLocationRows[0]?.count),
      visitRowsWithMissingActor: toNumber(missingActorRows[0]?.count),
      reversedVisitRowsExcluded: toNumber(reversedRows[0]?.count),
      notes: [
        'Vendor supply is shown as supplied quantity/value, not sales or revenue.',
        'Reversed visit records are excluded from active activity metrics.',
        'Location is based on free-text vendor location values.',
        'stock_sold is not used because it is not a reliable completed-sales metric in the current model.',
      ],
    };
  }

  private async getFilterOptions(): Promise<AdminDashboardFilterOptions> {
    const [locationRows] = await this.execute<Array<{ location: string }>>(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(location), ''), 'Unknown location') AS location
       FROM vendors
       ORDER BY location ASC`,
    );
    return {
      locations: locationRows.map((row) => normalizeLocation(row.location)),
    };
  }
}
