'use client';

import { useSalesRepsQuery } from '@/lib/hooks/queries';
import type { SalesRep } from '@/lib/types';

export function SalesRepList() {
  const { data, isLoading, isError } = useSalesRepsQuery();
  const salesReps: SalesRep[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-500">Loading sales reps…</div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Unable to load sales reps. Try again later.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(salesReps ?? []).map((rep) => (
            <div key={rep.sales_rep_id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
              <p className="font-semibold text-slate-900">{rep.name}</p>
              <p className="mt-1 text-sm text-slate-600">{rep.phone}</p>
              <p className="mt-3 text-sm text-slate-500">Role: {rep.role}</p>
              <p className="mt-1 text-sm text-slate-500">Status: {rep.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
