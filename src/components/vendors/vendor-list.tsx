'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SearchBar } from '@/components/ui/search-bar';
import { useAppStore } from '@/lib/store/useAppStore';
import { usePaginatedVendorsQuery } from '@/lib/hooks/queries';
import type { Vendor } from '@/lib/types';

interface PaginatedResult<T> {
  status: string;
  data: {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
  };
}

const PAGE_SIZE = 50;

export function VendorList() {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = usePaginatedVendorsQuery({ search: searchQuery }, page, PAGE_SIZE);

  const vendors = useMemo(() => {
    if (!data?.data?.items) return [] as Vendor[];
    return data.data.items;
  }, [data]);

  const totalCount = data?.data?.totalCount ?? 0;
  const currentPage = data?.data?.page ?? page;
  const pageSize = data?.data?.pageSize ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <SearchBar value={searchQuery} placeholder="Search by ID, name, phone, or location" onChange={(event) => handleSearchChange(event.target.value)} />
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-500">Loading vendors…</div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Unable to load vendors. Try again later.</div>
      ) : vendors.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-500">No matching vendors found.</div>
      ) : (
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <Link
              key={vendor.vendor_id}
              href={`/vendors/${vendor.vendor_id}`}
              className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-sidrah-300"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{vendor.vendor_name ?? vendor.vendor_id}</p>
                  <p className="mt-1 text-sm text-slate-600">{vendor.location ?? ''}{vendor.location && vendor.phone ? ' • ' : ''}{vendor.phone ?? ''}</p>
                </div>
                <span className="rounded-full bg-sidrah-50 px-3 py-1 text-xs font-semibold text-sidrah-700">
                  {vendor.vendor_id}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
