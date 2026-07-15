'use client';

import { useEffect, type FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCreateVisitMutation, useInventoryByVendorQuery } from '@/lib/hooks/queries';
import type { Vendor } from '@/lib/types';

const visitSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor is required'),
  stock_sold: z.number().min(0, 'Stock sold must be 0 or more'),
  cash_collected: z.number().min(0, 'Cash collected must be 0 or more'),
  stock_added: z.number().min(0, 'Stock added must be 0 or more'),
  notes: z.string().max(200).optional(),
});

interface VisitFormProps {
  vendors: Vendor[];
}

export function VisitForm({ vendors }: VisitFormProps) {
  const visitDraft = useAppStore((state) => state.visitDraft);
  const setVisitDraft = useAppStore((state) => state.setVisitDraft);
  const resetVisitDraft = useAppStore((state) => state.resetVisitDraft);
  const errorMessage = useAppStore((state) => state.errorMessage);
  const setErrorMessage = useAppStore((state) => state.setErrorMessage);

  useEffect(() => {
    if (!visitDraft.vendor_id && vendors.length > 0) {
      resetVisitDraft(vendors[0].vendor_id);
    }
  }, [vendors, resetVisitDraft, visitDraft.vendor_id]);

  const inventoryQuery = useInventoryByVendorQuery(visitDraft.vendor_id);
  const openingStock = inventoryQuery.data?.current_stock ?? 0;
  const { mutate, error, status } = useCreateVisitMutation();
  const isLoading = status === 'pending';
  const isError = status === 'error';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const result = visitSchema.safeParse(visitDraft);
    if (!result.success) {
      setErrorMessage(result.error.errors.map((item) => item.message).join(', '));
      return;
    }

    mutate(
      {
        vendor_id: visitDraft.vendor_id,
        opening_stock: openingStock,
        stock_sold: visitDraft.stock_sold,
        stock_added: visitDraft.stock_added,
        cash_collected: visitDraft.cash_collected,
        sales_rep: 'Sales Agent',
        notes: visitDraft.notes,
      },
      {
        onSuccess: () => {
          resetVisitDraft(visitDraft.vendor_id);
          setErrorMessage(null);
        },
        onError: (mutationError) => {
          setErrorMessage((mutationError as Error).message || 'Unable to save visit.');
        },
      },
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-700">
            Vendor
            <select
              value={visitDraft.vendor_id}
              onChange={(event) => setVisitDraft({ vendor_id: event.target.value })}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              {vendors.map((vendor) => (
                <option key={vendor.vendor_id} value={vendor.vendor_id}>
                  {vendor.vendor_name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Current stock</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{inventoryQuery.isLoading ? '…' : openingStock}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm text-slate-700">
            Stock Sold
            <input
              type="number"
              min={0}
              value={visitDraft.stock_sold}
              onChange={(event) => setVisitDraft({ stock_sold: Number(event.target.value) })}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Cash Collected
            <input
              type="number"
              min={0}
              value={visitDraft.cash_collected}
              onChange={(event) => setVisitDraft({ cash_collected: Number(event.target.value) })}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Stock Added
            <input
              type="number"
              min={0}
              value={visitDraft.stock_added}
              onChange={(event) => setVisitDraft({ stock_added: Number(event.target.value) })}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>
        </div>

        <label className="block text-sm text-slate-700">
          Notes
          <textarea
            value={visitDraft.notes}
            onChange={(event) => setVisitDraft({ notes: event.target.value })}
            className="mt-2 h-24 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            placeholder="Optional visit notes"
          />
        </label>

        {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
        {isError ? <p className="text-sm text-rose-600">Unable to save visit. Please try again.</p> : null}
        {inventoryQuery.isError ? <p className="text-sm text-rose-600">Unable to load inventory for selected vendor.</p> : null}

        <Button type="submit" className="w-full" disabled={isLoading || inventoryQuery.isLoading || !visitDraft.vendor_id}>
          {isLoading ? 'Submitting…' : 'Submit Visit'}
        </Button>
      </form>
    </div>
  );
}
