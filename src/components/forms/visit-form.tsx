'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store/useAppStore';
import { useAuthQuery, useCreateVisitMutation, useProductsQuery, useSalesRepsQuery, useVendorInventoryByVendorAndProductQuery } from '@/lib/hooks/queries';
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
  const clientTransactionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visitDraft.vendor_id && vendors.length > 0) {
      resetVisitDraft(vendors[0].vendor_id);
    }
  }, [vendors, resetVisitDraft, visitDraft.vendor_id]);

  const authQuery = useAuthQuery();
  const authData = authQuery.data;
  const productQuery = useProductsQuery();
  const salesRepsQuery = useSalesRepsQuery();
  const vendorInventoryQuery = useVendorInventoryByVendorAndProductQuery(visitDraft.vendor_id, visitDraft.product_id);
  const openingStock = vendorInventoryQuery.data?.current_stock ?? 0;
  const hasVendorInventory = !!vendorInventoryQuery.data;
  const { mutate, status, isSuccess, isPending } = useCreateVisitMutation();
  const isError = status === 'error';
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Parameters<typeof mutate>['0'] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const products = productQuery.data ?? [];
  const salesReps: SalesRep[] = Array.isArray(salesRepsQuery.data)
    ? salesRepsQuery.data
    : Array.isArray((salesRepsQuery.data as any)?.items)
    ? (salesRepsQuery.data as any).items
    : [];

  const selectedVendor = vendors.find((vendor) => vendor.vendor_id === visitDraft.vendor_id);
  const selectedProduct = products.find((product) => product.product_id === visitDraft.product_id);
  const selectedSalesRep = salesReps.find((salesRep) => salesRep.sales_rep_id === visitDraft.sales_rep_id);

  const selectedSalesRepName =
    selectedSalesRep?.name ??
    (authData?.valid && authData.role === 'agent'
      ? authData.name ?? authData.display_name ?? authData.full_name ?? authData.username
      : undefined) ??
    visitDraft.sales_rep_id;

  useEffect(() => {
    if (authData?.valid && authData.role === 'agent' && authData.sales_rep_id && visitDraft.sales_rep_id !== authData.sales_rep_id) {
      setVisitDraft({ sales_rep_id: authData.sales_rep_id });
      return;
    }

    if (authData?.valid && authData.role === 'agent') {
      return;
    }

    if (!visitDraft.sales_rep_id && salesReps.length > 0) {
      setVisitDraft({ sales_rep_id: salesReps[0].sales_rep_id });
    }
  }, [authData, salesReps, setVisitDraft, visitDraft.sales_rep_id]);

  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage('Visit submitted successfully.');
    }
  }, [isSuccess]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isPending) {
      return;
    }

    const result = visitSchema.safeParse(visitDraft);
    if (!result.success) {
      setErrorMessage(result.error.errors.map((item) => item.message).join(', '));
      return;
    }

    const salesRepIdToSubmit = authData?.valid && authData.role === 'agent' ? authData.sales_rep_id ?? '' : visitDraft.sales_rep_id;
    if (authData?.valid && authData.role === 'agent' && !authData.sales_rep_id) {
      setErrorMessage('Unable to determine your authenticated sales rep.');
      return;
    }

    if (!clientTransactionIdRef.current) {
      clientTransactionIdRef.current = `${visitDraft.vendor_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const draftPayload = {
      vendor_id: visitDraft.vendor_id,
      product_id: visitDraft.product_id,
      sales_rep_id: salesRepIdToSubmit,
      stock_sold: visitDraft.stock_sold,
      stock_added: visitDraft.stock_added,
      cash_collected: visitDraft.cash_collected,
      unit_price: visitDraft.unit_price,
      payment_method: visitDraft.payment_method,
      payment_reference: visitDraft.payment_reference,
      client_transaction_id: clientTransactionIdRef.current,
      notes: visitDraft.notes,
    } as const;

    setPreviewDraft(draftPayload);
    setIsPreviewOpen(true);
  }

  function handleConfirmSubmit() {
    if (!previewDraft) {
      setErrorMessage('Unable to submit visit. Preview data is missing.');
      return;
    }

    mutate(previewDraft, {
      onSuccess: () => {
        clientTransactionIdRef.current = null;
        resetVisitDraft(visitDraft.vendor_id);
        setErrorMessage(null);
        setPreviewDraft(null);
        setIsPreviewOpen(false);
      },
      onError: (mutationError) => {
        setErrorMessage((mutationError as Error).message || 'Unable to save visit.');
      },
    });
  }

  function handleCancelPreview() {
    setIsPreviewOpen(false);
  }

  function handleEditFromPreview() {
    setIsPreviewOpen(false);
  }

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsPreviewOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen]);

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
                  {`${vendor.vendor_name} — ${vendor.vendor_id} — ${vendor.phone}`}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Current stock</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{vendorInventoryQuery.isLoading ? '…' : openingStock}</p>
          </div>
        </div>

        {!vendorInventoryQuery.isLoading && !hasVendorInventory ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">This vendor has not received any stock yet.</p>
            <p className="mt-2 text-slate-600">Supply stock before recording visits.</p>
            <div className="mt-4">
              <a
                href={`/supply?vendorId=${visitDraft.vendor_id}`}
                className="inline-flex rounded-3xl bg-sidrah-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sidrah-600"
              >
                Supply Stock
              </a>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-700">
            Product
            <select
              value={visitDraft.product_id}
              onChange={(event) => {
                const selectedProductId = event.target.value;
                const selectedProduct = products.find((product) => product.product_id === selectedProductId);
                setVisitDraft({
                  product_id: selectedProductId,
                  unit_price: selectedProduct?.default_unit_price ?? 0,
                });
              }}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              required
            >
              <option value="">Select a product</option>
              {products
                .filter((product) => product.active)
                .map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name} ({product.sku})
                  </option>
                ))}
            </select>
          </label>

          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Unit price</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {visitDraft.product_id ? `GMD ${Number(visitDraft.unit_price || 0).toLocaleString()}` : '—'}
            </p>
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
              disabled={!hasVendorInventory || !visitDraft.product_id}
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
              disabled={!hasVendorInventory || !visitDraft.product_id}
            />
          </label>
          {hasVendorInventory ? (
            <label className="block text-sm text-slate-700">
              Stock Added
              <input
                type="number"
                min={0}
                value={visitDraft.stock_added}
                onChange={(event) => setVisitDraft({ stock_added: Number(event.target.value) })}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                disabled={!visitDraft.product_id}
              />
            </label>
          ) : null}
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
        {vendorInventoryQuery.isError ? (
          <p className="text-sm text-slate-600">
            Inventory information is unavailable. Vendor details are still visible.
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || vendorInventoryQuery.isLoading || !visitDraft.vendor_id || !visitDraft.product_id || !hasVendorInventory}
        >
          {isPending ? 'Submitting…' : 'Preview Visit'}
        </Button>
      </form>

      {isPreviewOpen && previewDraft ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-2xl max-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Preview visit details</h2>
                <p className="mt-1 text-sm text-slate-500">Review the visit before submitting.</p>
              </div>
              <button
                type="button"
                onClick={handleCancelPreview}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="mt-6 flex h-[calc(100vh-14rem)] flex-col overflow-hidden">
              <div className="overflow-y-auto pr-1 pb-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Vendor</div>
                    <div className="mt-2 font-semibold text-slate-900">{selectedVendor ? `${selectedVendor.vendor_name}` : previewDraft.vendor_id}</div>
                    <div className="text-sm text-slate-600">{selectedVendor ? `${selectedVendor.vendor_id}` : previewDraft.vendor_id}</div>
                    <div className="mt-2 text-sm text-slate-600">{selectedVendor?.phone}</div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Product</div>
                    <div className="mt-2 font-semibold text-slate-900">{selectedProduct ? `${selectedProduct.product_name}` : previewDraft.product_id}</div>
                    <div className="text-sm text-slate-600">{selectedProduct ? selectedProduct.sku : previewDraft.product_id}</div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Sales rep</div>
                    <div className="mt-2 font-semibold text-slate-900">{selectedSalesRepName}</div>
                    <div className="text-sm text-slate-600">{selectedSalesRep ? selectedSalesRep.sales_rep_id : previewDraft.sales_rep_id}</div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Payment</div>
                    <div className="mt-2 font-semibold text-slate-900">{previewDraft.payment_method}</div>
                    {previewDraft.payment_reference ? <div className="text-sm text-slate-600">Ref: {previewDraft.payment_reference}</div> : null}
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Stock sold</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{previewDraft.stock_sold}</div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Stock added</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{previewDraft.stock_added}</div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Cash collected</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">GMD {Number(previewDraft.cash_collected).toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Notes</div>
                    <div className="mt-2 text-sm text-slate-700">{previewDraft.notes || 'No notes provided.'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={handleEditFromPreview} className="w-full sm:w-auto">
                  Edit
                </Button>
                <Button type="button" className="w-full sm:w-auto" onClick={handleConfirmSubmit} disabled={isPending}>
                  {isPending ? 'Submitting…' : 'Confirm & Submit'}
                </Button>
                <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={handleCancelPreview}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
