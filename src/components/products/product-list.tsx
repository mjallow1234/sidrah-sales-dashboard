'use client';

import Link from 'next/link';
import { useProductsQuery } from '@/lib/hooks/queries';

export function ProductList() {
  const { data: products, isLoading, isError } = useProductsQuery();

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-500">Loading products…</div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Unable to load products. Try again later.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(products ?? []).map((product) => (
            <div key={product.product_id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">{product.product_name}</p>
                <Link href={`/products/${encodeURIComponent(product.product_id)}/edit`} className="shrink-0 rounded-2xl border border-sidrah-200 px-3 py-2 text-sm font-semibold text-sidrah-700 transition hover:bg-sidrah-50 focus:outline-none focus:ring-2 focus:ring-sidrah-500 focus:ring-offset-2">Edit</Link>
              </div>
              <p className="mt-1 text-sm text-slate-600">{product.category} • {product.unit}</p>
              <p className="mt-1 text-sm text-slate-500">SKU: {product.sku}</p>
              <p className="mt-1 text-sm text-slate-500">Low stock threshold: {product.low_stock_threshold}</p>
              <p className="mt-3 text-sm text-slate-500">Price: {product.currency} {product.default_unit_price.toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-500">Status: {product.active ? 'Active' : 'Inactive'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
