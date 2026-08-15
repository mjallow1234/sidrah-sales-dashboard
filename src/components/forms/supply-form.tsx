'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCreateSupplyMutation, useProductsQuery, useVendorsQuery } from '@/lib/hooks/queries';
import type { Vendor, Product } from '@/lib/types';

interface SupplyFormProps {
  defaultVendorId?: string;
}

export function SupplyForm({ defaultVendorId }: SupplyFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorQuery = useVendorsQuery();
  const productQuery = useProductsQuery();
  const vendorIdFromQuery = defaultVendorId || searchParams.get('vendorId') || '';
  const [vendorId, setVendorId] = useState<string>(vendorIdFromQuery);
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const clientTransactionIdRef = useRef<string | null>(null);

  const { data: vendors, isLoading: vendorsLoading, isError: vendorsError } = vendorQuery;
  const { data: products, isLoading: productsLoading, isError: productsError } = productQuery;
  const vendor = vendors?.find((item) => item.vendor_id === vendorId);
  const product = products?.find((item) => item.product_id === productId);

  const { mutate, isPending: isSubmitting, isSuccess, isError: submitError } = useCreateSupplyMutation();

  const vendorOptions = vendors ?? [];
  const productOptions = products ?? [];

  useEffect(() => {
    if (!vendorId && vendorIdFromQuery) {
      setVendorId(vendorIdFromQuery);
    }
  }, [vendorId, vendorIdFromQuery]);

  useEffect(() => {
    if (!productId && productOptions.length > 0) {
      setProductId(productOptions[0].product_id);
    }
  }, [productId, productOptions]);

  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage('Stock supplied successfully. Redirecting to vendor details...');
      window.setTimeout(() => {
        if (vendorId) {
          router.push(`/vendors/${vendorId}`);
        }
      }, 750);
    }
  }, [isSuccess, router, vendorId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isSubmitting) {
      return;
    }

    if (!vendorId) {
      setErrorMessage('Vendor is required.');
      return;
    }
    if (!productId) {
      setErrorMessage('Product is required.');
      return;
    }
    if (quantity <= 0) {
      setErrorMessage('Quantity supplied must be greater than zero.');
      return;
    }
    if (!date) {
      setErrorMessage('Date is required.');
      return;
    }

    if (!clientTransactionIdRef.current) {
      clientTransactionIdRef.current = `${vendorId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    mutate({
      vendor_id: vendorId,
      product_id: productId,
      quantity: Number(quantity),
      date,
      notes: notes.trim() || undefined,
      client_transaction_id: clientTransactionIdRef.current,
    });
  }

  const isDisabled = vendorsLoading || productsLoading || isSubmitting || !vendorId || !productId || quantity <= 0;

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Supply stock</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Supply inventory to the vendor</h1>
        <p className="mt-2 text-sm text-slate-600">Record a stock delivery and create vendor inventory for this vendor.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-700">
            Vendor
            <select
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              <option value="">Select vendor</option>
              {vendorOptions.map((vendorOption) => (
                <option key={vendorOption.vendor_id} value={vendorOption.vendor_id}>
                  {vendorOption.vendor_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            Product
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              <option value="">Select product</option>
              {productOptions.map((productOption) => (
                <option key={productOption.product_id} value={productOption.product_id}>
                  {productOption.product_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-700">
            Quantity supplied
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>

          <label className="block text-sm text-slate-700">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>
        </div>

        <label className="block text-sm text-slate-700">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-2 h-24 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            placeholder="Optional notes"
          />
        </label>

        {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
        {submitError ? <p className="text-sm text-rose-600">Unable to supply stock. Please try again.</p> : null}
        {successMessage ? <p className="text-sm text-slate-700">{successMessage}</p> : null}

        <Button type="submit" className="w-full" disabled={isDisabled}>
          {isSubmitting ? 'Supplying stock…' : 'Supply Stock'}
        </Button>
      </form>
    </div>
  );
}
