'use client';

import { type FormEvent, useState } from 'react';
import { useProductsQuery, useVendorsQuery, useTransferStockMutation, useRetrieveStockMutation } from '@/lib/hooks/queries';
import { Button } from '@/components/ui/button';

export default function AdminStockPage() {
  const { data: vendors } = useVendorsQuery();
  const { data: products } = useProductsQuery();
  const transferMutation = useTransferStockMutation();
  const retrieveMutation = useRetrieveStockMutation();
  const [mode, setMode] = useState<'transfer' | 'retrieval'>('transfer');
  const [sourceVendorId, setSourceVendorId] = useState('');
  const [destinationVendorId, setDestinationVendorId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const isTransfer = mode === 'transfer';
  const productOptions = products ?? [];
  const vendorOptions = vendors ?? [];

  function resetForm() {
    setSourceVendorId('');
    setDestinationVendorId('');
    setVendorId('');
    setProductId('');
    setQuantity(0);
    setNotes('');
    setMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!productId) {
      setMessage('Product is required.');
      return;
    }
    if (quantity <= 0) {
      setMessage('Quantity must be greater than zero.');
      return;
    }
    if (isTransfer) {
      if (!sourceVendorId || !destinationVendorId) {
        setMessage('Source and destination vendors are required.');
        return;
      }
      if (sourceVendorId === destinationVendorId) {
        setMessage('Source and destination must differ.');
        return;
      }

      transferMutation.mutate(
        {
          source_vendor_id: sourceVendorId,
          destination_vendor_id: destinationVendorId,
          product_id: productId,
          quantity,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: () => {
            setMessage('Stock transfer completed successfully.');
            resetForm();
          },
          onError: (error) => {
            setMessage(error.message);
          },
        }
      );
    } else {
      if (!vendorId) {
        setMessage('Vendor is required.');
        return;
      }

      retrieveMutation.mutate(
        {
          vendor_id: vendorId,
          product_id: productId,
          quantity,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: () => {
            setMessage('Stock retrieval completed successfully.');
            resetForm();
          },
          onError: (error) => {
            setMessage(error.message);
          },
        }
      );
    }
  }

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Admin stock movement</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Transfer or retrieve stock</h1>
          <p className="mt-2 text-sm text-slate-600">Use this page to move stock between vendors or retrieve stock from a vendor.</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={`rounded-3xl px-4 py-2 text-sm font-semibold ${isTransfer ? 'bg-sidrah-500 text-white' : 'bg-slate-100 text-slate-700'}`}
              onClick={() => {
                setMode('transfer');
                resetForm();
              }}
            >
              Transfer stock
            </button>
            <button
              type="button"
              className={`rounded-3xl px-4 py-2 text-sm font-semibold ${!isTransfer ? 'bg-sidrah-500 text-white' : 'bg-slate-100 text-slate-700'}`}
              onClick={() => {
                setMode('retrieval');
                resetForm();
              }}
            >
              Retrieve stock
            </button>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {isTransfer ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Source vendor
                  <select
                    value={sourceVendorId}
                    onChange={(event) => setSourceVendorId(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  >
                    <option value="">Select source vendor</option>
                    {vendorOptions.map((vendor) => (
                      <option key={vendor.vendor_id} value={vendor.vendor_id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-700">
                  Destination vendor
                  <select
                    value={destinationVendorId}
                    onChange={(event) => setDestinationVendorId(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  >
                    <option value="">Select destination vendor</option>
                    {vendorOptions.map((vendor) => (
                      <option key={vendor.vendor_id} value={vendor.vendor_id}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <label className="block text-sm text-slate-700">
                Vendor
                <select
                  value={vendorId}
                  onChange={(event) => setVendorId(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                >
                  <option value="">Select vendor</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor.vendor_id} value={vendor.vendor_id}>
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-700">
                Product
                <select
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                >
                  <option value="">Select product</option>
                  {productOptions.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-700">
                Quantity
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                />
              </label>
            </div>

            <label className="block text-sm text-slate-700">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                rows={4}
              />
            </label>

            {message ? <p className="text-sm text-slate-700">{message}</p> : null}
            {transferMutation.isError || retrieveMutation.isError ? (
              <p className="text-sm text-rose-600">{(transferMutation.error || retrieveMutation.error)?.message}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={transferMutation.isPending || retrieveMutation.isPending}>
              {transferMutation.isPending || retrieveMutation.isPending ? 'Processing…' : isTransfer ? 'Transfer stock' : 'Retrieve stock'}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
