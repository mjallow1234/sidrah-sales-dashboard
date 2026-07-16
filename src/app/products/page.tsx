import { ProductList } from '@/components/products/product-list';

export default function ProductsPage() {
  return (
    <main className="min-h-screen px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Products</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Product catalog</h1>
        </section>
        <ProductList />
      </div>
    </main>
  );
}
