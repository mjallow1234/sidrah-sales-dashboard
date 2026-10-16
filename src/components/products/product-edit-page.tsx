'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProductForm } from '@/components/forms/product-form';
import { useProductQuery } from '@/lib/hooks/queries';

export function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = typeof params.id === 'string' ? params.id : '';
  const productQuery = useProductQuery(productId);

  if (!productId || productQuery.isLoading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-500 shadow-soft">Loading product…</div>;
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        <p>Unable to load this product.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => productQuery.refetch()} className="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">Retry</button>
          <Link href="/products" className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2">Back to products</Link>
        </div>
      </div>
    );
  }

  const product = productQuery.data;
  const completeProduct = product.product_name && product.category && product.unit && product.currency && Number.isFinite(product.default_unit_price) && Number.isFinite(product.low_stock_threshold);
  if (!completeProduct) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700">This product is missing required details and cannot be edited safely.</div>;
  }

  return (
    <div className="space-y-4">
      <ProductForm initialValues={product} productId={product.product_id} onSuccess={() => router.push('/products')} />
      <Link href="/products" className="inline-flex rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sidrah-500 focus:ring-offset-2">Cancel</Link>
    </div>
  );
}
