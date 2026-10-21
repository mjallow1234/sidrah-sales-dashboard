'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/ui/search-bar';
import { usePaginatedVendorsQuery } from '@/lib/hooks/queries';
import type { Vendor } from '@/lib/types';
import { vendorHref } from '@/lib/navigation/vendorNavigation';

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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const appliedSearch = searchParams.get('search') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const [searchInput, setSearchInput] = useState(appliedSearch);
  const returnTo = `${pathname}${searchParamsString ? `?${searchParamsString}` : ''}`;
  const scrollKey = `vendor-list-scroll:${returnTo}`;
  useEffect(() => {
    setSearchInput(appliedSearch);
  }, [appliedSearch]);
  useEffect(() => {
    if (searchInput === appliedSearch) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParamsString);
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      params.delete('page');
      const nextSearchParamsString = params.toString();
      if (nextSearchParamsString !== searchParamsString) {
        router.replace(nextSearchParamsString ? `${pathname}?${nextSearchParamsString}` : pathname, { scroll: false });
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [appliedSearch, pathname, router, searchInput, searchParamsString]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = Number(window.sessionStorage.getItem(scrollKey));
      if (Number.isFinite(saved)) window.scrollTo({ top: saved, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollKey]);

  const location = searchParams.get('location') || undefined;
  const salesRepId = searchParams.get('salesRepId') || undefined;
  const balance = searchParams.get('balance') || undefined;
  const { data, isLoading, isError } = usePaginatedVendorsQuery({ search: appliedSearch, location, salesRepId, balance }, page, PAGE_SIZE);

  const vendors = useMemo(() => {
    if (!data?.data?.items) return [] as Vendor[];
    return data.data.items;
  }, [data]);

  const totalCount = data?.data?.totalCount ?? 0;
  const currentPage = data?.data?.page ?? page;
  const pageSize = data?.data?.pageSize ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };
  const changePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParamsString);
    if (nextPage > 1) params.set('page', String(nextPage)); else params.delete('page');
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <SearchBar value={searchInput} placeholder="Search by ID, name, phone, or location" onChange={(event) => handleSearchChange(event.target.value)} />
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
              href={vendorHref(vendor.vendor_id, returnTo)}
              onClick={() => window.sessionStorage.setItem(scrollKey, String(window.scrollY))}
              className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-sidrah-300"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{vendor.vendor_name ?? vendor.vendor_id}</p>
                  <p className="mt-1 text-sm text-slate-600">{vendor.location ?? ''}{vendor.location && vendor.phone ? ' • ' : ''}{vendor.phone ?? ''}</p>
                  <p className="mt-1 text-sm text-slate-600">Acquired By: {vendor.acquired_by_name || 'Not specified'}</p>
                  <p className="mt-1 text-sm text-slate-600">Vendor Type: {vendor.vendor_type_name || 'Not specified'}</p>
                  <p className="mt-1 text-sm text-slate-600">Status: {vendor.status_name || vendor.status}</p>
                  <p className="mt-1 text-xs text-slate-500">{vendor.location_latitude != null && vendor.location_longitude != null ? 'GPS location saved' : 'No GPS location'}</p>
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
          onClick={() => changePage(Math.max(1, currentPage - 1))}
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage >= totalPages}
          onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
