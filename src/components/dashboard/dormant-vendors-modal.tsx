'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePaginatedVendorsQuery } from '@/lib/hooks/queries';
import { useVendorTypesQuery } from '@/lib/hooks/vendorManagementQueries';

export function DormantVendorsModal({ onClose }: { onClose: () => void }) {
  const [location, setLocation] = useState('');
  const [vendorTypeId, setVendorTypeId] = useState('');
  const allDormant = usePaginatedVendorsQuery({ status: 'dormant' }, 1, 1000, true);
  const filtered = usePaginatedVendorsQuery({ status: 'dormant', location: location || undefined, vendorTypeId: vendorTypeId || undefined }, 1, 1000, true);
  const vendorTypes = useVendorTypesQuery(true);
  const locations = useMemo(() => Array.from(new Set((allDormant.data?.data.items ?? []).map((vendor) => vendor.location).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [allDormant.data]);
  const vendors = filtered.data?.data.items ?? [];

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Dormant vendors" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sidrah-500">Vendor status</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Dormant Vendors ({filtered.data?.data.totalCount ?? 0})</h2><p className="mt-2 text-sm text-slate-600">No qualifying payment visit in the last 14 days.</p></div><button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-100" aria-label="Close dormant vendors">×</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Location<select value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 p-3"><option value="">All locations</option>{locations.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Vendor type<select value={vendorTypeId} onChange={(event) => setVendorTypeId(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 p-3"><option value="">All vendor types</option>{(vendorTypes.data ?? []).map((type) => <option key={type.vendor_type_id} value={type.vendor_type_id}>{type.name}</option>)}</select></label></div>
      <div className="mt-5 space-y-2">{filtered.isLoading ? <p className="text-sm text-slate-500">Loading dormant vendors...</p> : vendors.length ? vendors.map((vendor) => <Link key={vendor.vendor_id} href={`/vendors/${vendor.vendor_id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-sidrah-300"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{vendor.vendor_name}</p><span className="text-xs font-semibold uppercase tracking-wide text-amber-700">Dormant</span></div><p className="mt-1 text-sm text-slate-600">{vendor.location || 'Unknown location'} · {vendor.vendor_type_name || 'Unknown vendor type'}</p><p className="mt-1 text-sm text-slate-600">Last visit: {vendor.last_visit_date || 'No qualifying visit'}</p></Link>) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No dormant vendors match these filters.</p>}</div>
    </div>
  </div>;
}
