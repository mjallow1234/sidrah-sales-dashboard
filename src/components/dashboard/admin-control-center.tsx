'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Boxes, Factory, Package, Users } from 'lucide-react';
import { useProductsQuery, useSalesRepsQuery } from '@/lib/hooks/queries';
import { useAdminDashboardSummaryQuery } from '@/lib/hooks/use-admin-dashboard-summary';
import type {
  AdminDashboardFilters,
  AdminDashboardLocationRow,
  AdminDashboardProductRow,
  AdminDashboardSalesRepRow,
  AdminDashboardTrendMetric,
  AdminDashboardTrendPoint,
} from '@/lib/types/admin-dashboard';

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
  href,
  tone = 'default',
}: {
  label: string;
  value: string;
  note: string;
  href?: string;
  tone?: 'default' | 'attention';
}) {
  const content = (
    <div className={`h-full rounded-3xl border p-5 shadow-soft transition ${tone === 'attention' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white hover:border-sidrah-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        {href ? <ArrowRight className="h-4 w-4 text-slate-400" /> : null}
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600">{note}</p>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{content}</Link> : content;
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

function TrendChart({ points, metric }: { points: AdminDashboardTrendPoint[]; metric: AdminDashboardTrendMetric }) {
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
          <a key={item.point.date} href={`/transactions`}>
            <circle cx={item.x} cy={item.y} r="5" fill="#0f8f6d" className="transition hover:r-7">
              <title>{`${item.point.date}: ${selected.unit === 'currency' ? formatCurrency(item.value) : formatNumber(item.value)}`}</title>
            </circle>
          </a>
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
  getHref,
  formatValue,
}: {
  rows: T[];
  metric: string;
  getLabel: (row: T) => string;
  getValue: (row: T) => number;
  getHref?: (row: T) => string | undefined;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...rows.map(getValue), 0);
  if (rows.length === 0 || max <= 0) return <EmptyState text={`No ${metric.toLowerCase()} data for the selected filters.`} />;
  return (
    <div className="mt-5 space-y-3">
      {rows.map((row, index) => {
        const value = getValue(row);
        const href = getHref?.(row);
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
        return href ? <Link key={`${getLabel(row)}-${index}`} href={href} className="block">{content}</Link> : <div key={`${getLabel(row)}-${index}`}>{content}</div>;
      })}
    </div>
  );
}

function SalesRepActivity({ rows }: { rows: AdminDashboardSalesRepRow[] }) {
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
            <Link href="/transactions" className="text-sm font-semibold text-sidrah-700">View activity</Link>
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
          <p className="mt-4 text-xs leading-5 text-slate-500">Current-state cards stay current; date range controls selected-period activity and trends.</p>
        </Panel>

        {summaryQuery.isLoading ? (
          <Panel><p className="text-slate-600">Loading Admin Control Center...</p></Panel>
        ) : summaryQuery.isError ? (
          <Panel className="border-rose-200 bg-rose-50"><p className="font-semibold text-rose-700">Unable to load dashboard summary.</p><p className="mt-2 text-sm text-rose-600">{summaryQuery.error.message}</p></Panel>
        ) : summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <KpiCard label="Cash Collected" value={formatCurrency(summary.snapshot.period.cashCollected)} note="Selected period, active visits only." href="/transactions" />
              <KpiCard label="Vendor Balances" value={formatCurrency(summary.snapshot.current.vendorReceivables)} note={`${formatNumber(summary.snapshot.current.vendorsOwing)} vendors owing now.`} href="/vendors" tone={summary.snapshot.current.vendorsOwing > 0 ? 'attention' : 'default'} />
              <KpiCard label="Supplied Quantity" value={formatQuantity(summary.snapshot.period.suppliedQuantity)} note="Selected period vendor supply." href="/transactions" />
              <KpiCard label="Supplied Value" value={formatCurrency(summary.snapshot.period.suppliedValue)} note="Expected value of supplied stock." href="/transactions" />
              <KpiCard label="Outstanding Deliveries" value={formatQuantity(summary.snapshot.current.outstandingDeliveryQuantity)} note={`${formatNumber(summary.snapshot.current.outstandingDeliveryRequests)} pending/ongoing requests.`} href="/deliveries" tone={summary.snapshot.current.outstandingDeliveryRequests > 0 ? 'attention' : 'default'} />
              <KpiCard label="Factory Finished Stock" value={formatQuantity(summary.snapshot.current.factoryFinishedStock)} note="Current Factory finished-product stock." href="/factory" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Trend</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">Cash and supply movement</h2>
                  </div>
                  <MetricTabs value={trendMetric} options={trendMetrics} onChange={setTrendMetric} />
                </div>
                <TrendChart points={summary.trends} metric={trendMetric} />
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
                  <Link href="/deliveries" className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-sidrah-200"><p className="font-semibold text-slate-900">Unassigned deliveries</p><p className="mt-1 text-2xl font-semibold">{formatNumber(summary.attention.unassignedDeliveries)}</p></Link>
                  <Link href="/deliveries" className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-sidrah-200"><p className="font-semibold text-slate-900">Outstanding deliveries</p><p className="mt-1 text-sm text-slate-600">{formatNumber(summary.attention.outstandingDeliveries)} requests, {formatQuantity(summary.attention.outstandingDeliveryQuantity)}</p></Link>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">Vendor credits / overpayments</p><p className="mt-1 text-sm text-slate-600">{formatCurrency(summary.snapshot.current.vendorCredits)} across {formatNumber(summary.snapshot.current.vendorsInCredit)} vendors.</p></div>
                  {summary.attention.lowFactoryStock.length > 0 ? <Link href="/factory" className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><p className="font-semibold">Low Factory stock</p><p className="mt-1 text-sm">{summary.attention.lowFactoryStock.length} product(s) at or below threshold.</p></Link> : null}
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Where</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Supply by Location</h2></div>
                  <MetricTabs value={locationMetric} options={locationMetricOptions} onChange={setLocationMetric} />
                </div>
                <RankedBars<AdminDashboardLocationRow> rows={summary.locations} metric="location" getLabel={(row) => row.location} getValue={(row) => row[locationMetric]} getHref={() => '/vendors'} formatValue={(value) => locationMetric === 'cashCollected' ? formatCurrency(value) : formatNumber(value)} />
              </Panel>

              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Products</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Supply by Product</h2></div>
                  <MetricTabs value={productMetric} options={productMetricOptions} onChange={setProductMetric} />
                </div>
                <RankedBars<AdminDashboardProductRow> rows={summary.products} metric="product" getLabel={(row) => row.productName} getValue={(row) => row[productMetric]} getHref={() => '/products'} formatValue={(value) => productMetric === 'suppliedQuantity' ? formatNumber(value) : formatCurrency(value)} />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <Panel>
                <div className="flex items-center gap-3"><Users className="h-5 w-5 text-sidrah-600" /><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Who</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Sales Representative Activity</h2></div></div>
                <SalesRepActivity rows={summary.salesReps} />
              </Panel>

              <Panel>
                <div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-sidrah-600" /><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Vendor Balances</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Vendor Balances Owing</h2></div></div>
                <div className="mt-5 space-y-3">
                  {summary.attention.topVendorsOwing.length === 0 ? <EmptyState text="No positive vendor balances found for the current filters." /> : summary.attention.topVendorsOwing.map((vendor) => (
                    <Link key={vendor.vendorId} href={`/vendors/${vendor.vendorId}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-sidrah-200">
                      <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-slate-900">{vendor.vendorName}</p><p className="mt-1 text-sm text-slate-500">{vendor.location}</p></div><p className="font-semibold text-slate-900">{formatCurrency(vendor.amount)}</p></div>
                    </Link>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Panel>
                <div className="flex items-center gap-3"><Factory className="h-5 w-5 text-sidrah-600" /><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory Operations</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Operational stock movement</h2></div></div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <KpiCard label="Production" value={formatQuantity(summary.factory.productionQuantity)} note="Selected period, active Factory production." href="/factory/production" />
                  <KpiCard label="Factory Outflow" value={formatQuantity(summary.factory.outflowQuantity)} note="Selected period leaving Factory movements." href="/factory/movements" />
                </div>
                <div className="mt-4 space-y-2">
                  {summary.factory.products.slice(0, 5).map((product) => (
                    <div key={product.productId} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <span className="truncate font-semibold text-slate-800">{product.productName}</span>
                      <span className="shrink-0 text-slate-600">{formatNumber(product.currentQuantity)} {product.unit}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel>
                <div className="flex items-center gap-3"><Package className="h-5 w-5 text-sidrah-600" /><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Data Quality</p><h2 className="mt-1 text-xl font-semibold text-slate-900">Control indicators</h2></div></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Unknown locations</p><p className="mt-2 text-xl font-semibold">{formatNumber(summary.dataQuality.unknownLocationVendors)}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Missing actor rows</p><p className="mt-2 text-xl font-semibold">{formatNumber(summary.dataQuality.visitRowsWithMissingActor)}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Reversed visits excluded</p><p className="mt-2 text-xl font-semibold">{formatNumber(summary.dataQuality.reversedVisitRowsExcluded)}</p></div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  {summary.dataQuality.notes.map((note) => <p key={note}>- {note}</p>)}
                </div>
              </Panel>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
