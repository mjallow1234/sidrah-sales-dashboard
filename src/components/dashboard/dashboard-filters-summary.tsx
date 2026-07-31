'use client';

import { useDashboardFilters } from './dashboard-filters-provider';

export function DashboardFiltersSummary({ isAgent = false, today = '' }: { isAgent?: boolean; today?: string }) {
  const { filters } = useDashboardFilters();

  const items = isAgent
    ? [
        { label: 'Date range', value: `${today} → ${today}` },
      ]
    : [
        { label: 'Date range', value: `${filters.startDate} → ${filters.endDate}` },
        { label: 'Sales rep', value: filters.salesRepId || 'All sales reps' },
        { label: 'Vendor', value: filters.vendorId || 'All vendors' },
        { label: 'Product', value: filters.productId || 'All products' },
        { label: 'Market', value: filters.market || 'All markets' },
      ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Active filters</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <span className="text-slate-500">{item.label}</span>
            <span className="text-slate-700">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
