'use client';

import { VisitForm } from '@/components/forms/visit-form';
import { useVendorsQuery } from '@/lib/hooks/queries';

export function VisitShell() {
  const { data: vendors, isLoading, isError } = useVendorsQuery();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-soft">
        Loading vendor list…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-soft">
        Unable to load vendors. Please refresh.
      </div>
    );
  }

  return <VisitForm vendors={vendors ?? []} />;
}
