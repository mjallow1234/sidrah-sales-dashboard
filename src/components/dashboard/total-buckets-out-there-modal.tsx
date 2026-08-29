'use client';

import type { ReactNode } from 'react';

interface ProductBreakdownItem {
  productName: string;
  quantity: number;
}

interface TotalBucketsOutThereModalProps {
  total: number;
  products: ProductBreakdownItem[];
  onClose: () => void;
}

export function TotalBucketsOutThereModal({ total, products, onClose }: TotalBucketsOutThereModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:mx-auto">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Total Buckets Out There</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Current product breakdown</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Overall total</p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">{total.toLocaleString()}</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="grid grid-cols-[1fr_0.4fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              <span>Product</span>
              <span className="text-right">Buckets</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto bg-white">
              {products.length === 0 ? (
                <div className="p-6 text-sm text-slate-600">No products available for the current filters.</div>
              ) : (
                products.map((product, index) => (
                  <div
                    key={`${product.productName}-${index}`}
                    className="grid grid-cols-[1fr_0.4fr] gap-4 border-b border-slate-100 px-4 py-4 text-sm text-slate-700 last:border-b-0"
                  >
                    <span className="truncate font-medium">{product.productName}</span>
                    <span className="text-right font-semibold">{product.quantity.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
