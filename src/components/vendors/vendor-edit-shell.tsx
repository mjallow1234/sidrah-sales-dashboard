'use client';

import { VendorForm } from '@/components/forms/vendor-form';
import { Fab } from '@/components/ui/fab';
import { useVendorQuery } from '@/lib/hooks/queries';

interface VendorEditShellProps {
  vendorId: string;
}

export function VendorEditShell({ vendorId }: VendorEditShellProps) {
  const { data: vendor, isLoading, isError } = useVendorQuery(vendorId);

  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Edit Vendor</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Update vendor details</h1>
        </section>
        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-500">Loading vendor…</div>
        ) : isError || !vendor ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Unable to load vendor.</div>
        ) : (
          <VendorForm vendorId={vendorId} initialValues={vendor} onSuccess={() => window.history.back()} />
        )}
      </div>
      <Fab href={`/vendors/${vendorId}`} label="Back to vendor" />
    </main>
  );
}
