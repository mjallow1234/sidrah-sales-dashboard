'use client';

import { useMemo, type ReactNode } from 'react';
import { useDashboardFilters } from './dashboard-filters-provider';
import { useVendorIntelligenceQuery, useVendorsQuery } from '@/lib/hooks/queries';
import type { SignalStatus, VendorIntelligence } from '@/lib/types';

function formatNumber(value: number | undefined) {
  if (value === undefined || value === null) return '-';
  return value.toLocaleString();
}

function formatCurrency(value: number | undefined) {
  if (value === undefined || value === null) return '-';
  return `GMD ${value.toLocaleString()}`;
}

function formatPercent(value: number | undefined) {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(0)}%`;
}

function getStatusMessage(status: SignalStatus | undefined) {
  switch (status) {
    case 'no_history':
      return 'No visit history available.';
    case 'insufficient_data':
      return 'Insufficient visit history to calculate a reliable forecast.';
    case 'sparse_data':
      return 'Limited history available; interpret with caution.';
    case 'ok':
    default:
      return undefined;
  }
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-2">{value}</p>
    </div>
  );
}

function renderEvidenceDetails(evidence: { sourceTable: string; sourceColumns: string[]; filterDescription: string; rowCount: number; dateRange?: { start: string; end: string } }[]) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return <p className="text-sm text-slate-500">Evidence details are unavailable.</p>;
  }

  return (
    <div className="space-y-4">
      {evidence.map((item, index) => (
        <div key={`${item.sourceTable}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{item.sourceTable}</p>
          <p className="mt-2 text-slate-600">{item.filterDescription}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <span className="font-semibold">Rows used:</span> {item.rowCount}
            </div>
            {item.dateRange ? (
              <div>
                <span className="font-semibold">Date range:</span> {item.dateRange.start} - {item.dateRange.end}
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-slate-600">
            <span className="font-semibold">Columns:</span> {item.sourceColumns.join(', ')}
          </p>
        </div>
      ))}
    </div>
  );
}

function SignalCard({
  label,
  status,
  value,
  note,
  evidence,
}: {
  label: string;
  status?: SignalStatus;
  value?: React.ReactNode;
  note?: string;
  evidence?: { sourceTable: string; sourceColumns: string[]; filterDescription: string; rowCount: number; dateRange?: { start: string; end: string } }[];
}) {
  const statusMessage = getStatusMessage(status);
  const showEvidence = Array.isArray(evidence) && evidence.length > 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          {status ? (
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                status === 'ok' ? 'bg-slate-100 text-slate-700' : status === 'no_history' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {status.replace('_', ' ')}
            </span>
          ) : null}
        </div>
        {showEvidence ? (
          <details className="text-right text-sm text-slate-500">
            <summary className="cursor-pointer underline decoration-slate-300 underline-offset-2">Evidence</summary>
            <div className="mt-3">{renderEvidenceDetails(evidence ?? [])}</div>
          </details>
        ) : null}
      </div>
      <div className="mt-4 text-slate-900 text-sm">
        {value ? (
          <div className="space-y-3">{value}</div>
        ) : (
          <p className="text-sm text-slate-600">{statusMessage ?? '-'}</p>
        )}
        {note ? <p className="mt-2 text-sm text-slate-600">{note}</p> : null}
      </div>
    </div>
  );
}

function renderProductPerformanceTable(performance: VendorIntelligence['productPerformance']) {
  if (performance.status !== 'ok') {
    return <p className="text-sm text-slate-600">{getStatusMessage(performance.status)}</p>;
  }

  const rows = performance.value ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p className="text-sm text-slate-600">No product performance data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr>
            <th className="whitespace-nowrap px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">Product</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">Units sold</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">Current stock</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">Expected value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((item) => (
            <tr key={item.productId}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{item.productName ?? item.productId}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatNumber(item.unitsSold)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatNumber(item.currentStock)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatCurrency(item.expectedValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VendorIntelligenceSection() {
  const { filters, setFilters } = useDashboardFilters();
  const selectedVendorId = filters.vendorId;
  const { data: vendors = [] } = useVendorsQuery();
  const market = filters.market || undefined;
  const {
    data: intelligence,
    isLoading,
    isError,
    error,
    refetch,
  } = useVendorIntelligenceQuery(selectedVendorId || undefined, market);

  const vendorOptions = useMemo(
    () => [
      { value: '', label: 'Select a vendor' },
      ...vendors.map((vendor) => ({
        value: vendor.vendor_id,
        label: `${vendor.vendor_id} - ${vendor.vendor_name}`,
      })),
    ],
    [vendors]
  );

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.vendor_id === selectedVendorId),
    [vendors, selectedVendorId]
  );

  const intelligenceErrorMessage = error instanceof Error ? error.message : 'Unable to load vendor intelligence.';
  const selectedEvidence = intelligence?.summary.evidence ?? [];
  const visitEvidence = selectedEvidence.find((item) => item.sourceTable === 'visit_logs');
  const inventoryEvidence = selectedEvidence.find((item) => item.sourceTable === 'vendor_inventory');
  const balanceEvidence = selectedEvidence.find((item) => item.sourceTable === 'vendor_balances');

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Vendor Intelligence</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Quick vendor intelligence</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SelectField label="Vendor" value={selectedVendorId} options={vendorOptions} onChange={(value) => setFilters({ vendorId: value })} />
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Market context</p>
          <p className="mt-2 text-slate-600">{market ? market : 'No market selected'}</p>
        </div>
      </div>

      <div className="mt-6">
        {!selectedVendorId ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
            Select a vendor to view intelligence.
          </div>
        ) : isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
            Loading vendor intelligence…
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p>{intelligenceErrorMessage}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 inline-flex rounded-3xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        ) : intelligence ? (
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Executive summary</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900 leading-7">{intelligence.summary.headline}</h3>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                    {intelligence.summary.confidence === 'strong'
                      ? 'Strong evidence'
                      : intelligence.summary.confidence === 'moderate'
                      ? 'Moderate evidence'
                      : 'Limited evidence'}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">{intelligence.summary.explanation}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <DataChip label="Vendor" value={selectedVendor?.vendor_name ?? selectedVendorId} />
                  <DataChip label="Last visit" value={intelligence.lastVisit.value.lastVisitDate ?? 'Unknown'} />
                  <DataChip label="Visit count" value={formatNumber(intelligence.salesVelocity.value.visitCount)} />
                  <DataChip label="Coverage" value={`${formatNumber(intelligence.salesVelocity.value.windowDays)} days`} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Evidence summary</p>
                <div className="mt-5 grid gap-3">
                  <DataChip label="Visit records" value={`${visitEvidence?.rowCount ?? '-'} rows`} />
                  <DataChip label="Inventory records" value={`${inventoryEvidence?.rowCount ?? '-'} rows`} />
                  <DataChip label="Balance records" value={`${balanceEvidence?.rowCount ?? '-'} rows`} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Current stock</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{formatNumber(intelligence.currentInventory.value.totalStockUnits)}</p>
                <p className="mt-2 text-sm text-slate-600">Across {formatNumber(intelligence.currentInventory.value.totalProducts)} products</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Recent sales</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{formatNumber(intelligence.salesVolume.value.totalUnitsSold)}</p>
                <p className="mt-2 text-sm text-slate-600">Units sold in last {formatNumber(intelligence.salesVelocity.value.windowDays)} days</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Sales value</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(intelligence.salesVolume.value.totalSalesValue)}</p>
                <p className="mt-2 text-sm text-slate-600">Collected {formatCurrency(intelligence.salesVolume.value.totalCashCollected)}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Chief balance</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(intelligence.outstandingBalance.value.balanceOwed)}</p>
                <p className="mt-2 text-sm text-slate-600">Receivables: {formatCurrency(intelligence.outstandingBalance.value.positiveReceivables)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Cash collection</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{formatCurrency(intelligence.paymentMetrics.value.totalCashCollected)}</p>
                <p className="mt-2 text-sm text-slate-600">Out of {formatCurrency(intelligence.paymentMetrics.value.totalExpectedCash)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Collection rate</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{formatPercent(intelligence.paymentMetrics.value.collectionRate)}</p>
                <p className="mt-2 text-sm text-slate-600">Based on visit receipts</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Stock coverage</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{intelligence.stockRemaining.value.daysRemaining !== undefined ? formatNumber(intelligence.stockRemaining.value.daysRemaining) : '-'}</p>
                <p className="mt-2 text-sm text-slate-600">{intelligence.stockRemaining.value.method === 'averageDailySales' ? 'Days of coverage' : 'Insufficient history'}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Attention</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">What needs attention</h3>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {intelligence.risks.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      No significant operational risk detected from the available data.
                    </div>
                  ) : (
                    intelligence.risks.map((risk, index) => (
                      <div key={`${risk.title}-${index}`} className="rounded-3xl border border-rose-200 bg-rose-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{risk.title}</p>
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">{risk.level ?? 'Risk'}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{risk.detail}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">Evidence sources</p>
                        <p className="text-sm text-slate-600">{risk.evidence.length} source{risk.evidence.length !== 1 ? 's' : ''}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Opportunities</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">What to act on</h3>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  {intelligence.opportunities.map((opportunity, index) => (
                    <div key={`${opportunity.title}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-900">{opportunity.title}</p>
                      <p className="mt-2 text-sm text-slate-700">{opportunity.detail}</p>
                      {opportunity.action ? (
                        <>
                          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">Action</p>
                          <p className="text-sm text-slate-600">{opportunity.action}</p>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Product intelligence</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">Performance by product</h3>
                </div>
              </div>
              {intelligence.productPerformance.status !== 'ok' ? (
                <p className="mt-4 text-sm text-slate-600">No product performance data is available.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {intelligence.productPerformance.value.slice(0, 3).map((product) => (
                    <div key={product.productId} className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{product.productName ?? product.productId}</p>
                          <p className="mt-1 text-sm text-slate-600">{product.category || product.unit || 'Product details'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
                          {product.movementClassification === 'fast'
                            ? 'Fast'
                            : product.movementClassification === 'slow'
                            ? 'Slow'
                            : product.movementClassification === 'not_moving'
                            ? 'No movement'
                            : 'Normal'}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm text-slate-700">
                        <div>
                          <p className="font-semibold text-slate-900">Sold</p>
                          <p className="mt-1">{formatNumber(product.unitsSold)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Stock</p>
                          <p className="mt-1">{formatNumber(product.currentStock)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Value</p>
                          <p className="mt-1">{formatCurrency(product.expectedValue)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Share</p>
                          <p className="mt-1">{product.salesShare !== undefined ? `${product.salesShare.toFixed(1)}%` : '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
