'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store/useAppStore';
import { useCreateVisitMutation, useInventoryByVendorQuery, useProductsQuery, useSalesRepsQuery } from '@/lib/hooks/queries';
import type { Vendor, Product, SalesRep } from '@/lib/types';

const visitSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor is required'),
  product_id: z.string().min(1, 'Product is required'),
  sales_rep_id: z.string().min(1, 'Sales rep is required'),
  unit_price: z.number().min(0, 'Unit price must be 0 or more'),
  payment_method: z.string().min(1, 'Payment method is required'),
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

  const productQuery = useProductsQuery();
  const salesRepsQuery = useSalesRepsQuery();
  const inventoryQuery = useInventoryByVendorQuery(visitDraft.vendor_id);
  const openingStock = inventoryQuery.data?.current_stock ?? 0;
  const { mutate, status, isSuccess, isPending } = useCreateVisitMutation();
  const isError = status === 'error';
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const products = productQuery.data ?? [];
  const salesReps = Array.isArray(salesRepsQuery.data)
    ? salesRepsQuery.data
    : Array.isArray((salesRepsQuery.data as any)?.items)
    ? (salesRepsQuery.data as any).items
    : [];

  useEffect(() => {
    if (!visitDraft.vendor_id && vendors.length > 0) {
      resetVisitDraft(vendors[0].vendor_id);
    }
  }, [vendors, resetVisitDraft, visitDraft.vendor_id]);

  useEffect(() => {
    if (!visitDraft.product_id && products.length > 0) {
      setVisitDraft({ product_id: products[0].product_id, unit_price: products[0].default_unit_price });
    }
  }, [products, setVisitDraft, visitDraft.product_id]);

  useEffect(() => {
    if (!visitDraft.sales_rep_id && salesReps.length > 0) {
      setVisitDraft({ sales_rep_id: salesReps[0].sales_rep_id });
    }
  }, [salesReps, setVisitDraft, visitDraft.sales_rep_id]);

  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage('Visit submitted successfully.');
    }
  }, [isSuccess]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = visitSchema.safeParse(visitDraft);
    if (!result.success) {
      setErrorMessage(result.error.errors.map((item) => item.message).join(', '));
      return;
    }

    const clientTransactionId = `${visitDraft.vendor_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    mutate(
      {
        vendor_id: visitDraft.vendor_id,
        product_id: visitDraft.product_id,
        sales_rep_id: visitDraft.sales_rep_id,
        stock_sold: visitDraft.stock_sold,
        stock_added: visitDraft.stock_added,
        cash_collected: visitDraft.cash_collected,
        unit_price: visitDraft.unit_price,
        payment_method: visitDraft.payment_method,
        payment_reference: visitDraft.payment_reference,
        client_transaction_id: clientTransactionId,
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

        <Button type="submit" className="w-full" disabled={isPending || inventoryQuery.isLoading || !visitDraft.vendor_id}>
          {isPending ? 'Submitting…' : 'Submit Visit'}
        </Button>
      </form>
    </div>
  );
}
