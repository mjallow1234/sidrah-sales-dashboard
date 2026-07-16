'use client';

import { ProductForm } from '@/components/forms/product-form';
import { Fab } from '@/components/ui/fab';

export default function NewProductPage() {
  return (
    <main className="min-h-screen px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Add Product</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Create a new product</h1>
        </section>
        <ProductForm onSuccess={() => window.history.back()} />
      </div>
      <Fab href="/products" label="Back to products" />
    </main>
  );
}
