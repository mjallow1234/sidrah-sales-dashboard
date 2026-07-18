'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { SearchBar } from '@/components/ui/search-bar';
import { useAppStore } from '@/lib/store/useAppStore';
import { useVendorsQuery } from '@/lib/hooks/queries';

export function VendorSearch() {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const { data: vendors, isLoading, isError } = useVendorsQuery();
  const vendorList = Array.isArray(vendors) ? vendors : [];

  const filteredVendors = useMemo(() => {
    const normalized = searchQuery.toLowerCase();
    return vendorList.filter((vendor) => {
      return (
        vendor.vendor_id.toLowerCase().includes(normalized) ||
        vendor.vendor_name.toLowerCase().includes(normalized) ||
        vendor.phone.toLowerCase().includes(normalized)
      );
    });
  }, [searchQuery, vendorList]);

  return (
    <div className="space-y-4">
      <SearchBar value={searchQuery} placeholder="Search by ID, name, phone" onChange={(event) => setSearchQuery(event.target.value)} />
      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-500">Loading vendors…</div>
        ) : isError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Unable to load vendors. Try again later.</div>
        ) : filteredVendors.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-500">No matching vendors found.</div>
        ) : (
          filteredVendors.map((vendor) => (
            <Link
              key={vendor.vendor_id}
              href={`/vendors/${vendor.vendor_id}`}
              className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-sidrah-300"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{vendor.vendor_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{vendor.location} • {vendor.phone}</p>
                </div>
                <span className="rounded-full bg-sidrah-50 px-3 py-1 text-xs font-semibold text-sidrah-700">
                  {vendor.vendor_id}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
