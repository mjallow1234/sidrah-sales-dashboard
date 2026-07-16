'use client';

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
              <p className="font-semibold text-slate-900">{product.product_name}</p>
              <p className="mt-1 text-sm text-slate-600">{product.category} • {product.unit}</p>
              <p className="mt-3 text-sm text-slate-500">Price: {product.currency} {product.default_unit_price.toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-500">Status: {product.active ? 'Active' : 'Inactive'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
