'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Vendor } from '@/lib/types';

interface VendorOwing {
  vendor_id: string;
  vendor_name: string;
  balance_owed: number;
  last_visit_date: string;
}

interface VendorsOwingModalProps {
  vendors: VendorOwing[];
  totalOwed: number;
  onClose: () => void;
}

export function VendorsOwingModal({ vendors, totalOwed, onClose }: VendorsOwingModalProps) {
  const positiveVendors = useMemo(() => vendors.filter((vendor) => vendor.balance_owed > 0), [vendors]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:mx-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Vendors Owing</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Total Owed: GMD {totalOwed.toLocaleString()}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {positiveVendors.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
              No vendors currently owe a balance.
            </div>
          ) : (
            <div className="space-y-4">
              {positiveVendors.map((vendor) => (
                <Link
                  key={vendor.vendor_id}
                  href={`/vendors/${vendor.vendor_id}`}
                  className="block rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sidrah-300 hover:bg-slate-100"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{vendor.vendor_name || vendor.vendor_id}</p>
                      <p className="text-sm text-slate-500">Last visit: {vendor.last_visit_date || 'Unknown'}</p>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-slate-900 sm:mt-0">GMD {vendor.balance_owed.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
