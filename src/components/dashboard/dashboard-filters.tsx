'use client';

import { useMemo } from 'react';
import { useDashboardFilters } from './dashboard-filters-provider';
import { useProductsQuery, useSalesRepsQuery, useVendorsQuery } from '@/lib/hooks/queries';
import type { DashboardFilters } from '@/lib/types';

const marketOptions = [
  { value: '', label: 'All markets' },
  { value: 'north', label: 'North' },
  { value: 'south', label: 'South' },
  { value: 'east', label: 'East' },
  { value: 'west', label: 'West' },
];

function SelectField({
  label,
  value,
  name,
  options,
  onChange,
}: {
  label: string;
  value: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-slate-700">
      {label}
      <select
        name={name}
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

function DateField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: 'startDate' | 'endDate';
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-slate-700">
      {label}
      <input
        type="date"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
      />
    </label>
  );
}

export function DashboardFilters() {
  const { filters, setFilters, resetFilters } = useDashboardFilters();
  const { data: products = [] } = useProductsQuery();
  const { data: salesReps = [] } = useSalesRepsQuery();
  const { data: vendors = [] } = useVendorsQuery();

  const vendorOptions = useMemo(
    () => [{ value: '', label: 'All vendors' }, ...vendors.map((vendor) => ({ value: vendor.vendor_id, label: vendor.vendor_name }))],
    [vendors]
  );

  const salesRepOptions = useMemo(
    () => [{ value: '', label: 'All sales reps' }, ...salesReps.map((salesRep) => ({ value: salesRep.sales_rep_id, label: salesRep.name }))],
    [salesReps]
  );

  const productOptions = useMemo(
    () => [{ value: '', label: 'All products' }, ...products.map((product) => ({ value: product.product_id, label: product.product_name }))],
    [products]
  );

  const handleExport = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const url = `/api/dashboard/export?${params.toString()}`;
    window.location.href = url;
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Dashboard filters</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Refine the analytics view</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Reset filters
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-3xl bg-sidrah-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sidrah-600"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <DateField label="Start date" name="startDate" value={filters.startDate} onChange={(value) => setFilters({ startDate: value })} />
        <DateField label="End date" name="endDate" value={filters.endDate} onChange={(value) => setFilters({ endDate: value })} />
        <SelectField label="Sales rep" name="salesRepId" value={filters.salesRepId} options={salesRepOptions} onChange={(value) => setFilters({ salesRepId: value })} />
        <SelectField label="Vendor" name="vendorId" value={filters.vendorId} options={vendorOptions} onChange={(value) => setFilters({ vendorId: value })} />
        <SelectField label="Product" name="productId" value={filters.productId} options={productOptions} onChange={(value) => setFilters({ productId: value })} />
        <SelectField label="Market" name="market" value={filters.market} options={marketOptions} onChange={(value) => setFilters({ market: value })} />
      </div>
    </section>
  );
}
