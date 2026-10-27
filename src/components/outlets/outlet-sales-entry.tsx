'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCreateOutletSaleMutation, useMyOutletSalesQuery, useOutletSalesEntryContextQuery } from '@/lib/hooks/outletQueries';

const today = () => new Date().toISOString().slice(0, 10);

export function OutletSalesEntry({ outletId }: { outletId: string }) {
  const context = useOutletSalesEntryContextQuery(outletId);
  const save = useCreateOutletSaleMutation();
  const [filters, setFilters] = useState({ from: '', to: '' });
  const mine = useMyOutletSalesQuery(outletId, filters);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saleDate, setSaleDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const product = context.data?.products.find((item) => item.product_id === productId);
  const previewQuantity = Number(quantity);
  const previewPrice = Number(price);
  const previewLineTotal = Number.isFinite(previewQuantity) && Number.isFinite(previewPrice) ? Math.round(previewQuantity * previewPrice * 100) / 100 : 0;
  if (context.isLoading) return <p>Loading sales entry...</p>;
  if (context.isError || !context.data) return <p className="text-rose-600">Unable to load assigned outlet.</p>;
  const resetForm = () => { setProductId(''); setQuantity('1'); setPrice(''); setPaymentMethod('cash'); setSaleDate(today()); setNotes(''); setIsPreview(false); };
  const submit = () => { if (save.isPending) return; save.mutate({ outletId, payload: { product_id: productId, quantity: Number(quantity), selling_price: Number(price), payment_method: paymentMethod, sale_date: saleDate, notes } }, { onSuccess: resetForm }); };
  return <div className="space-y-5">
    <Link href="/outlet-sales" className="text-sm font-semibold text-sidrah-700">← Assigned outlets</Link>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs uppercase tracking-[0.2em] text-sidrah-500">Trade-fair sales</p><h1 className="mt-2 text-2xl font-semibold">{context.data.outlet.name}</h1><p className="mt-1 text-slate-600">Sales entry only</p>
      {isPreview ? <div className="mt-5 space-y-4" aria-label="Sale preview">
        <div className="rounded-2xl border border-sidrah-200 bg-sidrah-50 p-4 text-sm"><h2 className="font-semibold">Review sale before submitting</h2><dl className="mt-2 grid gap-1 sm:grid-cols-2"><div><dt className="text-slate-500">Outlet</dt><dd>{context.data.outlet.name}</dd></div><div><dt className="text-slate-500">Sale date</dt><dd>{saleDate}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Notes</dt><dd>{notes || '—'}</dd></div></dl></div>
        <div className="rounded-2xl border border-slate-200 p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{product?.product_name} ({product?.unit})</span><span>{previewQuantity} × GMD {previewPrice.toLocaleString()} = GMD {previewLineTotal.toLocaleString()}</span></div><p className="mt-2 text-slate-600">Payment method: {paymentMethod}</p><p className="mt-3 flex justify-between border-t pt-3 font-semibold"><span>Final sale total</span><span>GMD {previewLineTotal.toLocaleString()}</span></p></div>
        {save.isError && <p className="text-sm text-rose-600">{save.error.message}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsPreview(false)} disabled={save.isPending} className="rounded-2xl border border-slate-300 px-4 py-3 font-semibold">Back to Edit</button><button type="button" onClick={submit} disabled={save.isPending} className="rounded-2xl bg-sidrah-500 px-4 py-3 font-semibold text-white">{save.isPending ? 'Saving...' : 'Confirm & Submit'}</button></div>
      </div> : <form onSubmit={(event) => { event.preventDefault(); if (!save.isPending) setIsPreview(true); }} className="mt-5 space-y-3">
        <select required value={productId} onChange={(event) => { const selected = context.data?.products.find((item) => item.product_id === event.target.value); setProductId(event.target.value); setPrice(selected ? String(selected.default_unit_price) : ''); }} className="w-full rounded-2xl border p-3"><option value="">Select product</option>{context.data.products.map((item) => <option key={item.product_id} value={item.product_id} disabled={item.available_stock <= 0}>{item.product_name} ({item.unit}) — GMD {item.default_unit_price.toLocaleString()} · {item.available_stock} available</option>)}</select>
        <input required min="0.001" step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-2xl border p-3" placeholder="Quantity" />
        <input required min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-2xl border p-3" placeholder="Selling price per unit" />
        <p className="text-sm text-slate-600">Default product price: GMD {product?.default_unit_price?.toLocaleString() ?? '—'} · Enter the actual trade-fair unit price.</p>
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-2xl border p-3"><option>cash</option><option>mobile_money</option><option>credit</option><option>other</option></select><input required type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} className="w-full rounded-2xl border p-3" /><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-2xl border p-3" placeholder="Notes (optional)" />
        <button type="submit" disabled={save.isPending || !productId} className="w-full rounded-2xl bg-sidrah-500 px-4 py-3 font-semibold text-white">Preview Sale</button>{save.isSuccess && <p className="text-sm text-emerald-700">Sale recorded.</p>}{save.isError && <p className="text-sm text-rose-600">{save.error.message}</p>}
      </form>}
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">My Sales</h2><p className="text-sm text-slate-600">Only sales recorded by your account.</p></div><div className="flex gap-2"><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="rounded-xl border p-2" /><input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="rounded-xl border p-2" /></div></div><div className="mt-4 space-y-2">{(mine.data ?? []).map((sale) => <article key={`${sale.sale_id}-${sale.product_id}`} className="rounded-2xl border border-slate-100 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{sale.sale_date} · {sale.product_name}</span><span className={sale.reversed ? 'font-semibold text-rose-700' : 'font-semibold'}>{sale.reversed ? 'Reversed' : `GMD ${sale.sale_total.toLocaleString()}`}</span></div><p className="mt-1 text-slate-600">{sale.quantity} × GMD {sale.selling_price.toLocaleString()} = GMD {sale.line_total.toLocaleString()} · {sale.payment_method}</p><p className="mt-1 text-xs text-slate-500">Recorded at {sale.created_at}</p>{sale.reversed && <p className="mt-1 text-xs text-rose-700">Reason: {sale.reversal_reason} · Reversed at {sale.reversed_at}</p>}</article>)}{mine.isLoading && <p className="text-sm text-slate-500">Loading your sales...</p>}{mine.isError && <p className="text-sm text-rose-600">Unable to load your sales.</p>}{mine.data?.length === 0 && <p className="text-slate-500">No sales recorded in this period.</p>}</div></section>
  </div>;
}
