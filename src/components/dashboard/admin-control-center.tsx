'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Boxes, Factory, Package, Users } from 'lucide-react';
import { useDeliveriesQuery, useFactoryInventoryQuery, useFactoryMovementsQuery, usePaginatedVendorsQuery, useProductsQuery, useSalesRepsQuery, useTransactionsQuery } from '@/lib/hooks/queries';
import { useVendorBalancesQuery } from '@/lib/hooks/queries';
import { useAdminDashboardSummaryQuery } from '@/lib/hooks/use-admin-dashboard-summary';
import type {
  AdminDashboardFilters,
  AdminDashboardLocationRow,
  AdminDashboardProductRow,
  AdminDashboardSalesRepRow,
  AdminDashboardTrendMetric,
  AdminDashboardTrendPoint,
} from '@/lib/types/admin-dashboard';
import type { DeliveryRecord, FactoryInventory, FactoryStockMovement, Vendor, VendorBalance } from '@/lib/types';

type LocationMetric = 'suppliedQuantity' | 'cashCollected' | 'activeVendors';
type ProductMetric = 'suppliedQuantity' | 'cashCollected' | 'suppliedValue';

const trendMetrics: Array<{ id: AdminDashboardTrendMetric; label: string; unit: 'currency' | 'number' }> = [
  { id: 'cash_collected', label: 'Cash Collected', unit: 'currency' },
  { id: 'supplied_quantity', label: 'Supplied Quantity', unit: 'number' },
  { id: 'supplied_value', label: 'Supplied Value', unit: 'currency' },
];

const datePresets = [
  { label: 'Today', days: 1 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 3 Months', days: 90 },
  { label: 'This Year', days: 365 },
];

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function defaultFilters(): AdminDashboardFilters {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatQuantity(value: number, unit = 'buckets') {
  return `${formatNumber(value)} ${unit}`;
}

function formatCurrency(value: number) {
  return `GMD ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type DetailKind = 'transactions' | 'vendors' | 'deliveries' | 'inventory' | 'movements' | 'summary';
type DetailRow = { label: string; value: string; detail?: string; href?: string };
type DetailSpec = { title: string; kind: DetailKind; value: string; filters?: AdminDashboardFilters; transactionMetric?: 'cash' | 'quantity' | 'value'; deliveryFilters?: { status?: string; productId?: string; unassigned?: boolean }; productId?: string; movementType?: 'production' | 'leaving_factory'; vendorBalanceFilter?: 'owing' | 'credit'; rows?: DetailRow[] };

function ModalShell({ title, value, onClose, children }: { title: string; value: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sidrah-500">Dashboard detail</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2><p className="mt-2 text-sm text-slate-600">Total represented: <span className="font-semibold text-slate-900">{value}</span></p></div><button type="button" aria-label="Close detail" onClick={onClose} className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-100">×</button></div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function DetailModal({ spec, onClose }: { spec: DetailSpec; onClose: () => void }) {
  const transactionFilters = spec.filters ? { startDate: spec.filters.startDate, endDate: spec.filters.endDate, productId: spec.filters.productId, market: spec.filters.location, salesRepId: spec.filters.salesRepId } : undefined;
  const transactions = useTransactionsQuery(transactionFilters, spec.kind === 'transactions');
  const vendors = usePaginatedVendorsQuery({ location: spec.filters?.location, salesRepId: spec.filters?.salesRepId, balance: spec.vendorBalanceFilter }, 1, 1000, spec.kind === 'vendors');
  const balances = useVendorBalancesQuery(spec.kind === 'vendors');
  const deliveries = useDeliveriesQuery(spec.deliveryFilters, spec.kind === 'deliveries');
  const inventory = useFactoryInventoryQuery({ productId: spec.productId }, spec.kind === 'inventory');
  const movements = useFactoryMovementsQuery({ startDate: spec.filters?.startDate, endDate: spec.filters?.endDate, productId: spec.productId, movementType: spec.movementType }, spec.kind === 'movements');

  let body: React.ReactNode;
  if (spec.kind === 'summary') {
    body = spec.rows?.length ? <div className="space-y-2">{spec.rows.map((row) => { const content = <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-sidrah-300"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{row.label}</p><p className="font-semibold text-slate-800">{row.value}</p></div>{row.detail ? <p className="mt-1 text-sm text-slate-600">{row.detail}</p> : null}</div>; return row.href ? <Link key={`${row.label}-${row.detail}`} href={row.href} className="block">{content}</Link> : <div key={`${row.label}-${row.detail}`}>{content}</div>; })}</div> : <EmptyState text="No records contribute to this dashboard value." />;
  } else if (spec.kind === 'transactions') {
    const rows = (transactions.data ?? []).filter((row) => spec.transactionMetric === 'cash' ? row.cash_collected > 0 : row.stock_added > 0);
    body = transactions.isLoading ? <p className="text-sm text-slate-500">Loading records...</p> : rows.length ? <div className="space-y-2">{rows.map((row) => <div key={`${row.visit_id}-${row.product_id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-900">{row.vendor_id ? <Link href={`/vendors/${row.vendor_id}`} className="text-sidrah-700 hover:underline">{row.vendor_name || row.vendor_id}</Link> : row.vendor_name || 'Unknown vendor'}</p><p className="font-semibold text-slate-800">{spec.transactionMetric === 'cash' ? formatCurrency(row.cash_collected) : spec.transactionMetric === 'value' ? formatCurrency(row.stock_added * (row.unit_price ?? 0)) : formatNumber(row.stock_added)}</p></div><p className="mt-1 text-sm text-slate-600">Visit {row.visit_id || '—'} · {row.date} · {row.sales_rep_name || row.sales_rep_id || 'Unassigned agent'}</p></div>)}</div> : <EmptyState text="No matching visit records." />;
  } else if (spec.kind === 'vendors') {
    const balanceMap = new Map((balances.data ?? []).map((row: VendorBalance) => [row.vendor_id, Number(row.balance_owed) || 0]));
    const rows = (vendors.data?.data.items ?? []).filter((row: Vendor) => spec.vendorBalanceFilter === 'owing' ? (balanceMap.get(row.vendor_id) ?? 0) > 0 : true);
    body = vendors.isLoading ? <p className="text-sm text-slate-500">Loading vendors...</p> : rows.length ? <div className="space-y-2">{rows.map((row) => <div key={row.vendor_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{row.vendor_name}</p><p className="font-semibold text-slate-800">{formatCurrency(balanceMap.get(row.vendor_id) ?? 0)}</p></div><p className="mt-1 text-sm text-slate-600">{row.vendor_id} · {row.location || 'Unknown location'} · {row.sales_rep_name || 'Unassigned agent'}</p></div>)}</div> : <EmptyState text="No vendors match this dashboard value." />;
  } else if (spec.kind === 'deliveries') {
    const rows = deliveries.data ?? [];
    body = deliveries.isLoading ? <p className="text-sm text-slate-500">Loading deliveries...</p> : rows.length ? <div className="space-y-2">{rows.map((row: DeliveryRecord) => <div key={row.delivery_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{row.delivery_id}</p><p className="text-sm font-semibold capitalize text-slate-700">{row.status}</p></div><p className="mt-1 text-sm text-slate-600">{row.customer_name} · requested {String(row.date_created).slice(0, 10)}</p></div>)}</div> : <EmptyState text="No matching deliveries." />;
  } else if (spec.kind === 'inventory') {
    const rows = inventory.data ?? [];
    body = inventory.isLoading ? <p className="text-sm text-slate-500">Loading inventory...</p> : rows.length ? <div className="space-y-2">{rows.map((row: FactoryInventory) => <div key={row.product_id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3"><span className="font-semibold text-slate-900">{row.product_name || row.product_id}</span><span className="font-semibold text-slate-800">{formatNumber(row.current_quantity)} {row.unit || 'units'}</span></div>)}</div> : <EmptyState text="No factory inventory records." />;
  } else {
    const rows = movements.data ?? [];
    body = movements.isLoading ? <p className="text-sm text-slate-500">Loading factory movements...</p> : rows.length ? <div className="space-y-2">{rows.map((row: FactoryStockMovement) => <div key={row.movement_id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3"><div><p className="font-semibold text-slate-900">{row.product_name || row.product_id}</p><p className="text-sm text-slate-600">{row.movement_type} · {String(row.occurred_at).slice(0, 10)}</p></div><span className="font-semibold text-slate-800">{formatNumber(row.quantity)} {row.unit || 'units'}</span></div>)}</div> : <EmptyState text="No factory movement records." />;
  }
  return <ModalShell title={spec.title} value={spec.value} onClose={onClose}>{body}</ModalShell>;
}

function trendValue(point: AdminDashboardTrendPoint, metric: AdminDashboardTrendMetric) {
  if (metric === 'cash_collected') return point.cashCollected;
  if (metric === 'supplied_value') return point.suppliedValue;
  return point.suppliedQuantity;
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-soft ${className}`}>{children}</section>;
}

function KpiCard({
  label,
  value,
  note,
  onClick,
  tone = 'default',
}: {
  label: string;
  value: string;
  note: string;
  onClick?: () => void;
  tone?: 'default' | 'attention';
}) {
  const content = (
    <div className={`h-full rounded-3xl border p-5 shadow-soft transition ${tone === 'attention' ? 'border-amber-200 bg-amber-50 hover:border-amber-300' : 'border-slate-200 bg-white hover:border-sidrah-200'} cursor-pointer`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        {onClick ? <ArrowRight className="h-4 w-4 text-slate-400" /> : null}
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600">{note}</p>
    </div>
  );
  return onClick ? <button type="button" onClick={onClick} className="block h-full w-full text-left">{content}</button> : content;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{text}</div>;
}

function MetricTabs<T extends string>({ value, options, onChange }: { value: T; options: Array<{ id: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="flex max-w-full gap-2 overflow-x-auto rounded-3xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`shrink-0 rounded-3xl px-3 py-2 text-sm font-semibold transition ${value === option.id ? 'bg-white text-sidrah-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function TrendChart({ points, metric, onPointClick }: { points: AdminDashboardTrendPoint[]; metric: AdminDashboardTrendMetric; onPointClick?: (point: AdminDashboardTrendPoint) => void }) {
  const selected = trendMetrics.find((item) => item.id === metric) ?? trendMetrics[0];
  const values = points.map((point) => trendValue(point, metric));
  const max = Math.max(...values, 0);

  if (points.length === 0 || max <= 0) {
    return <EmptyState text="No period activity found for the selected filters." />;
  }

  const width = 640;
  const height = 220;
  const padding = 24;
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : padding + index * step;
    const y = height - padding - (trendValue(point, metric) / max) * (height - padding * 2);
    return { x, y, point, value: trendValue(point, metric) };
  });
  const polyline = coordinates.map((item) => `${item.x},${item.y}`).join(' ');

  return (
    <div className="mt-5 overflow-hidden rounded-3xl bg-slate-50 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${selected.label} trend`} className="h-64 w-full">
        <polyline fill="none" stroke="#0f8f6d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
        {coordinates.map((item) => (
          <g key={item.point.date} role={onPointClick ? 'button' : undefined} tabIndex={onPointClick ? 0 : undefined} onClick={() => onPointClick?.(item.point)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onPointClick?.(item.point); }}>
            <circle cx={item.x} cy={item.y} r="5" fill="#0f8f6d" className="cursor-pointer transition hover:r-7">
              <title>{`${item.point.date}: ${selected.unit === 'currency' ? formatCurrency(item.value) : formatNumber(item.value)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-between gap-3 px-2 text-xs text-slate-500">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function RankedBars<T>({
  rows,
  metric,
  getLabel,
  getValue,
  onRowClick,
  formatValue,
}: {
  rows: T[];
  metric: string;
  getLabel: (row: T) => string;
  getValue: (row: T) => number;
  onRowClick?: (row: T) => void;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...rows.map(getValue), 0);
  if (rows.length === 0 || max <= 0) return <EmptyState text={`No ${metric.toLowerCase()} data for the selected filters.`} />;
  return (
    <div className="mt-5 space-y-3">
      {rows.map((row, index) => {
        const value = getValue(row);
        const handleClick = onRowClick ? () => onRowClick(row) : undefined;
        const content = (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-sidrah-200">
            <div className="flex items-center justify-between gap-4 text-sm">
              <p className="min-w-0 truncate font-semibold text-slate-900">{getLabel(row)}</p>
              <p className="shrink-0 font-semibold text-slate-700">{formatValue ? formatValue(value) : formatNumber(value)}</p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-sidrah-500" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
          </div>
        );
        return handleClick ? <button type="button" key={`${getLabel(row)}-${index}`} onClick={handleClick} className="block w-full text-left">{content}</button> : <div key={`${getLabel(row)}-${index}`}>{content}</div>;
      })}
    </div>
  );
}

function SalesRepActivity({ rows, onSelect }: { rows: AdminDashboardSalesRepRow[]; onSelect: (row: AdminDashboardSalesRepRow) => void }) {
  if (rows.length === 0) return <EmptyState text="No sales representative activity found for the selected period." />;
  return (
    <div className="mt-5 space-y-3">
      {rows.map((row) => (
        <article key={row.salesRepId ?? row.salesRepName} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{row.salesRepName}</p>
              {row.hasUnresolvedIdentity ? <p className="mt-1 text-xs text-amber-700">Legacy records include unresolved actor identity.</p> : null}
            </div>
            <button type="button" onClick={() => onSelect(row)} className="text-sm font-semibold text-sidrah-700 hover:underline">View activity</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div><p className="text-xs uppercase text-slate-500">Visits</p><p className="font-semibold">{formatNumber(row.visits)}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Vendors</p><p className="font-semibold">{formatNumber(row.vendorsVisited)}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Supply</p><p className="font-semibold">{formatNumber(row.suppliedQuantity)}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Value</p><p className="font-semibold">{formatCurrency(row.suppliedValue)}</p></div>
            <div><p className="text-xs uppercase text-slate-500">Cash</p><p className="font-semibold">{formatCurrency(row.cashCollected)}</p></div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AdminControlCenter() {
  const [filters, setFilters] = useState<AdminDashboardFilters>(() => defaultFilters());
  const [detail, setDetail] = useState<DetailSpec | null>(null);
  const [trendMetric, setTrendMetric] = useState<AdminDashboardTrendMetric>('cash_collected');
  const [locationMetric, setLocationMetric] = useState<LocationMetric>('suppliedQuantity');
  const [productMetric, setProductMetric] = useState<ProductMetric>('suppliedQuantity');
  const { data: products = [] } = useProductsQuery();
  const { data: salesReps = [] } = useSalesRepsQuery();
  const summaryQuery = useAdminDashboardSummaryQuery(filters);
  const summary = summaryQuery.data;

  const locationMetricOptions = useMemo(() => [
    { id: 'suppliedQuantity' as const, label: 'Supplied Quantity' },
    { id: 'cashCollected' as const, label: 'Cash Collected' },
    { id: 'activeVendors' as const, label: 'Active Vendors' },
  ], []);

  const productMetricOptions = useMemo(() => [
    { id: 'suppliedQuantity' as const, label: 'Supplied Quantity' },
    { id: 'suppliedValue' as const, label: 'Supplied Value' },
    { id: 'cashCollected' as const, label: 'Cash Collected' },
  ], []);

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFilters((current) => ({ ...current, startDate: formatDate(start), endDate: formatDate(end) }));
  }

  function updateFilter(key: keyof AdminDashboardFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  }

  const hasAppliedFilters = Boolean(filters.startDate)
    || Boolean(filters.endDate)
    || Boolean(filters.productId)
    || Boolean(filters.location)
    || Boolean(filters.salesRepId);

  const periodFilters = { startDate: filters.startDate, endDate: filters.endDate, productId: filters.productId, location: filters.location, salesRepId: filters.salesRepId };
  const openTransactions = (title: string, value: string, transactionMetric: 'cash' | 'quantity' | 'value', extra?: Partial<AdminDashboardFilters>) => setDetail({ title, value, kind: 'transactions', filters: { ...periodFilters, ...extra }, transactionMetric });
  const openSummary = (title: string, value: string, rows: DetailRow[]) => setDetail({ title, value, kind: 'summary', rows });

  return (
    <div className="px-4 pb-24 pt-8 sm:px-6 sm:pb-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Admin Control Center</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Company operating snapshot</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Accurate management metrics from vendor supply, cash collections, vendor balances, deliveries, and Factory operations. Vendor supply is not labeled as sales or revenue.
              </p>
            </div>
            <Link href="/reports" className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              Reports
            </Link>
          </div>
        </section>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Filters</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Selected period activity</h2>
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto">
              {datePresets.map((preset) => (
                <button key={preset.label} type="button" onClick={() => applyPreset(preset.days)} className="shrink-0 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block text-sm text-slate-700">Start date<input type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
            <label className="block text-sm text-slate-700">End date<input type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
            <label className="block text-sm text-slate-700">Product<select value={filters.productId ?? ''} onChange={(event) => updateFilter('productId', event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"><option value="">All products</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}</select></label>
            <label className="block text-sm text-slate-700">Location<select value={filters.location ?? ''} onChange={(event) => updateFilter('location', event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"><option value="">All locations</option>{summary?.filterOptions.locations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
            <label className="block text-sm text-slate-700">Sales Representative<select value={filters.salesRepId ?? ''} onChange={(event) => updateFilter('salesRepId', event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"><option value="">All sales reps</option>{salesReps.map((rep) => <option key={rep.sales_rep_id} value={rep.sales_rep_id}>{rep.name}</option>)}</select></label>
          </div>
          <button type="button" onClick={() => setFilters({ startDate: '', endDate: '', productId: '', location: '', salesRepId: '' })} disabled={!hasAppliedFilters} className="mt-4 rounded-3xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">Reset Filters</button>
          <p className="mt-4 text-xs leading-5 text-slate-500">Current-state cards stay current; date range controls selected-period activity and trends.</p>
        </Panel>

        {summaryQuery.isLoading ? (
          <Panel><p className="text-slate-600">Loading Admin Control Center...</p></Panel>
        ) : summaryQuery.isError ? (
          <Panel className="border-rose-200 bg-rose-50"><p className="font-semibold text-rose-700">Unable to load dashboard summary.</p><p className="mt-2 text-sm text-rose-600">{summaryQuery.error.message}</p></Panel>
        ) : summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <KpiCard label="Cash Collected" value={formatCurrency(summary.snapshot.period.cashCollected)} note="Selected period, active visits only." onClick={() => openTransactions('Cash Collected', formatCurrency(summary.snapshot.period.cashCollected), 'cash')} />
              <KpiCard label="Vendor Balances" value={formatCurrency(summary.snapshot.current.vendorReceivables)} note={`${formatNumber(summary.snapshot.current.vendorsOwing)} vendors owing now.`} onClick={() => setDetail({ title: 'Vendor Balances Owing', value: formatCurrency(summary.snapshot.current.vendorReceivables), kind: 'vendors', filters: periodFilters, vendorBalanceFilter: 'owing' })} tone={summary.snapshot.current.vendorsOwing > 0 ? 'attention' : 'default'} />
              <KpiCard label="Supplied Quantity" value={formatQuantity(summary.snapshot.period.suppliedQuantity)} note="Selected period vendor supply." onClick={() => openTransactions('Supplied Quantity', formatQuantity(summary.snapshot.period.suppliedQuantity), 'quantity')} />
              <KpiCard label="Supplied Value" value={formatCurrency(summary.snapshot.period.suppliedValue)} note="Expected value of supplied stock." onClick={() => openTransactions('Supplied Value', formatCurrency(summary.snapshot.period.suppliedValue), 'value')} />
              <KpiCard label="Outstanding Deliveries" value={formatQuantity(summary.snapshot.current.outstandingDeliveryQuantity)} note={`${formatNumber(summary.snapshot.current.outstandingDeliveryRequests)} pending/ongoing requests.`} onClick={() => setDetail({ title: 'Outstanding Deliveries', value: formatQuantity(summary.snapshot.current.outstandingDeliveryQuantity), kind: 'deliveries', deliveryFilters: { status: 'pending,ongoing', productId: filters.productId } })} tone={summary.snapshot.current.outstandingDeliveryRequests > 0 ? 'attention' : 'default'} />
              <KpiCard label="Factory Finished Stock" value={formatQuantity(summary.snapshot.current.factoryFinishedStock)} note="Current Factory finished-product stock." onClick={() => setDetail({ title: 'Factory Finished Stock', value: formatQuantity(summary.snapshot.current.factoryFinishedStock), kind: 'inventory', productId: filters.productId })} />
            </div>

            <Panel>
              <div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Vendors</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Vendor Status</h2><p className="mt-2 text-sm text-slate-600">Current vendor status counts. Status cards do not include balance amounts.</p></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(summary.vendorStatuses ?? []).map((status) => <button key={status.statusId} type="button" onClick={() => setDetail({ title: `${status.statusName} Vendors`, value: formatNumber(status.count), kind: 'summary', rows: status.vendors.map((vendor) => ({ label: vendor.vendorName, value: vendor.vendorId, detail: vendor.statusName, href: `/vendors/${vendor.vendorId}` })) })} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sidrah-300 hover:bg-white"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{status.statusName}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{formatNumber(status.count)}</p><p className="mt-1 text-xs text-slate-500">vendors</p></button>)}
              </div>
            </Panel>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Trend</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">Cash and supply movement</h2>
                  </div>
                  <MetricTabs value={trendMetric} options={trendMetrics} onChange={setTrendMetric} />
                </div>
                <TrendChart points={summary.trends} metric={trendMetric} onPointClick={(point) => openTransactions(`${trendMetrics.find((item) => item.id === trendMetric)?.label ?? 'Trend'} · ${point.date}`, trendMetric === 'cash_collected' ? formatCurrency(point.cashCollected) : trendMetric === 'supplied_value' ? formatCurrency(point.suppliedValue) : formatNumber(point.suppliedQuantity), trendMetric === 'cash_collected' ? 'cash' : trendMetric === 'supplied_value' ? 'value' : 'quantity', { startDate: point.date, endDate: point.date })} />
              </Panel>

              <Panel>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Needs Attention</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">Actionable exceptions</h2>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <button type="button" onClick={() => setDetail({ title: 'Unassigned Deliveries', value: formatNumber(summary.attention.unassignedDeliveries), kind: 'deliveries', deliveryFilters: { status: 'pending', unassigned: true, productId: filters.productId } })} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-sidrah-200"><p className="font-semibold text-slate-900">Unassigned deliveries</p><p className="mt-1 text-2xl font-semibold">{formatNumber(summary.attention.unassignedDeliveries)}</p></button>
                  <button type="button" onClick={() => setDetail({ title: 'Outstanding Deliveries', value: `${formatNumber(summary.attention.outstandingDeliveries)} requests`, kind: 'deliveries', deliveryFilters: { status: 'pending,ongoing', productId: filters.productId } })} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-sidrah-200"><p className="font-semibold text-slate-900">Outstanding deliveries</p><p className="mt-1 text-sm text-slate-600">{formatNumber(summary.attention.outstandingDeliveries)} requests, {formatQuantity(summary.attention.outstandingDeliveryQuantity)}</p></button>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">Vendor credits / overpayments</p><p className="mt-1 text-sm text-slate-600">{formatCurrency(summary.snapshot.current.vendorCredits)} across {formatNumber(summary.snapshot.current.vendorsInCredit)} vendors.</p></div>
                  {summary.attention.lowFactoryStock.length > 0 ? <button type="button" onClick={() => openSummary('Low Factory Stock', formatNumber(summary.attention.lowFactoryStock.length), summary.attention.lowFactoryStock.map((row) => ({ label: row.productName, value: formatNumber(row.currentQuantity), detail: `Current quantity · ${row.unit}` })))} className="block w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-900"><p className="font-semibold">Low Factory stock</p><p className="mt-1 text-sm">{summary.attention.lowFactoryStock.length} product(s) at or below threshold.</p></button> : null}
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Where</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Supply by Location</h2></div>
                  <MetricTabs value={locationMetric} options={locationMetricOptions} onChange={setLocationMetric} />
                </div>
                <RankedBars<AdminDashboardLocationRow> rows={summary.locations} metric="location" getLabel={(row) => row.location} getValue={(row) => row[locationMetric]} onRowClick={(row) => locationMetric === 'activeVendors' ? setDetail({ title: `Active Vendors · ${row.location}`, value: formatNumber(row.activeVendors), kind: 'vendors', filters: { ...periodFilters, location: row.location } }) : openTransactions(`${locationMetric === 'cashCollected' ? 'Cash Collected' : 'Supplied Quantity'} · ${row.location}`, locationMetric === 'cashCollected' ? formatCurrency(row.cashCollected) : formatNumber(row.suppliedQuantity), locationMetric === 'cashCollected' ? 'cash' : 'quantity', { location: row.location })} formatValue={(value) => locationMetric === 'cashCollected' ? formatCurrency(value) : formatNumber(value)} />
              </Panel>

              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Products</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Supply by Product</h2></div>
                  <MetricTabs value={productMetric} options={productMetricOptions} onChange={setProductMetric} />
                </div>
                <RankedBars<AdminDashboardProductRow> rows={summary.products} metric="product" getLabel={(row) => row.productName} getValue={(row) => row[productMetric]} onRowClick={(row) => openTransactions(`${productMetric === 'cashCollected' ? 'Cash Collected' : productMetric === 'suppliedValue' ? 'Supplied Value' : 'Supplied Quantity'} · ${row.productName}`, productMetric === 'suppliedQuantity' ? formatNumber(row.suppliedQuantity) : formatCurrency(row[productMetric]), productMetric === 'cashCollected' ? 'cash' : productMetric === 'suppliedValue' ? 'value' : 'quantity', { productId: row.productId })} formatValue={(value) => productMetric === 'suppliedQuantity' ? formatNumber(value) : formatCurrency(value)} />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Panel>
                <div className="flex items-center gap-3"><Users className="h-5 w-5 text-sidrah-600" /><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Who</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Sales Representative Activity</h2></div></div>
                <SalesRepActivity rows={summary.salesReps} onSelect={(row) => openTransactions(`Sales Activity · ${row.salesRepName}`, formatCurrency(row.cashCollected), 'cash', { salesRepId: row.salesRepId })} />
              </Panel>

              <Panel>
                <div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-sidrah-600" /><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Vendor Balances</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Vendor Balances Owing</h2></div></div>
                <div className="mt-5 space-y-3">
                  {summary.attention.topVendorsOwing.length === 0 ? <EmptyState text="No positive vendor balances found for the current filters." /> : [...summary.attention.topVendorsOwing].sort((a, b) => b.amount - a.amount).map((vendor) => (
                    <button key={vendor.vendorId} type="button" onClick={() => openSummary(`Vendor Balance · ${vendor.vendorName}`, formatCurrency(vendor.amount), [{ label: vendor.vendorName, value: formatCurrency(vendor.amount), detail: `${vendor.vendorId} · ${vendor.location}` }])} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-sidrah-200">
                      <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{vendor.vendorName}</p><p className="mt-1 text-sm text-slate-500">{vendor.location}</p></div><p className="font-semibold text-slate-900">{formatCurrency(vendor.amount)}</p></div>
                    </button>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Panel>
                <div className="flex items-center gap-3"><Factory className="h-5 w-5 text-sidrah-600" /><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory Operations</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Operational stock movement</h2></div></div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <KpiCard label="Production" value={formatQuantity(summary.factory.productionQuantity)} note="Selected period, active Factory production." onClick={() => setDetail({ title: 'Factory Production', value: formatQuantity(summary.factory.productionQuantity), kind: 'movements', filters, productId: filters.productId, movementType: 'production' })} />
                  <KpiCard label="Factory Outflow" value={formatQuantity(summary.factory.outflowQuantity)} note="Selected period leaving Factory movements." onClick={() => setDetail({ title: 'Factory Outflow', value: formatQuantity(summary.factory.outflowQuantity), kind: 'movements', filters, productId: filters.productId, movementType: 'leaving_factory' })} />
                </div>
                <div className="mt-4 space-y-2">
                  {summary.factory.products.slice(0, 5).map((product) => (
                    <button type="button" key={product.productId} onClick={() => setDetail({ title: `Factory Stock · ${product.productName}`, value: `${formatNumber(product.currentQuantity)} ${product.unit}`, kind: 'inventory', productId: product.productId })} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-left text-sm hover:bg-sidrah-50">
                      <span className="truncate font-semibold text-slate-800">{product.productName}</span>
                      <span className="shrink-0 text-slate-600">{formatNumber(product.currentQuantity)} {product.unit}</span>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel>
                <div className="flex items-center gap-3"><Package className="h-5 w-5 text-sidrah-600" /><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Data Quality</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Control indicators</h2></div></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <button type="button" onClick={() => openSummary('Unknown Locations', formatNumber(summary.dataQuality.unknownLocationVendors), [{ label: 'Unknown-location vendors', value: formatNumber(summary.dataQuality.unknownLocationVendors) }])} className="rounded-2xl bg-slate-50 p-4 text-left hover:bg-sidrah-50"><p className="text-sm text-slate-500">Unknown locations</p><p className="mt-2 text-xl font-semibold">{formatNumber(summary.dataQuality.unknownLocationVendors)}</p></button>
                  <button type="button" onClick={() => openSummary('Missing Actor Rows', formatNumber(summary.dataQuality.visitRowsWithMissingActor), [{ label: 'Visit rows with missing actor', value: formatNumber(summary.dataQuality.visitRowsWithMissingActor) }])} className="rounded-2xl bg-slate-50 p-4 text-left hover:bg-sidrah-50"><p className="text-sm text-slate-500">Missing actor rows</p><p className="mt-2 text-xl font-semibold">{formatNumber(summary.dataQuality.visitRowsWithMissingActor)}</p></button>
                  <button type="button" onClick={() => openSummary('Reversed Visits Excluded', formatNumber(summary.dataQuality.reversedVisitRowsExcluded), [{ label: 'Reversed visits excluded', value: formatNumber(summary.dataQuality.reversedVisitRowsExcluded) }])} className="rounded-2xl bg-slate-50 p-4 text-left hover:bg-sidrah-50"><p className="text-sm text-slate-500">Reversed visits excluded</p><p className="mt-2 text-xl font-semibold">{formatNumber(summary.dataQuality.reversedVisitRowsExcluded)}</p></button>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  {summary.dataQuality.notes.map((note) => <p key={note}>- {note}</p>)}
                </div>
              </Panel>
            </div>
          </>
        ) : null}
      </div>
      {detail ? <DetailModal spec={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
