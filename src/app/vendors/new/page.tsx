'use client';

import { VendorForm } from '@/components/forms/vendor-form';
import { Fab } from '@/components/ui/fab';

export default function NewVendorPage() {
  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Add Vendor</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Create a new vendor</h1>
        </section>
        <VendorForm onSuccess={() => window.history.back()} />
      </div>
      <Fab href="/vendors" label="Back to vendors" />
    </main>
  );
}
