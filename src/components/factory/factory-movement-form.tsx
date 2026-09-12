'use client';

import { useState, type FormEvent } from 'react';
import { useProductsQuery, useCreateFactoryMovementMutation } from '@/lib/hooks/queries';
import { Button } from '@/components/ui/button';
import { NotificationBanner } from '@/components/ui/notification';
import type { FactoryMovementItem, FactoryMovementType } from '@/lib/types';

function today() { return new Date().toISOString().slice(0, 10); }
type MovementFormItem = { product_id: string; quantity: string };

export function FactoryMovementForm({ production = false }: { production?: boolean }) {
  const productsQuery = useProductsQuery();
  const products = productsQuery.data ?? [];
  const mutation = useCreateFactoryMovementMutation();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [movementItems, setMovementItems] = useState<MovementFormItem[]>([{ product_id: '', quantity: '' }]);
  const [date, setDate] = useState(today());
  const [movementType, setMovementType] = useState<FactoryMovementType>('leaving_factory');
  const [reason, setReason] = useState('');
  const [batchReference, setBatchReference] = useState('');
  const [inputQuantity, setInputQuantity] = useState('');
  const [inputUnit, setInputUnit] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function updateMovementItem(index: number, field: keyof MovementFormItem, value: string) {
    setMovementItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }
  function addMovementItem() { setMovementItems((items) => [...items, { product_id: '', quantity: '' }]); }
  function removeMovementItem(index: number) { setMovementItems((items) => items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : items); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    if (!date) return setMessage({ type: 'error', text: 'Date is required.' });
    let payloadItems: FactoryMovementItem[] | undefined;
    if (production) {
      if (!productId) return setMessage({ type: 'error', text: 'Product is required.' });
      if (!quantity || Number(quantity) <= 0) return setMessage({ type: 'error', text: 'Quantity must be greater than zero.' });
    } else {
      const seen = new Set<string>();
      for (const item of movementItems) {
        if (!item.product_id) return setMessage({ type: 'error', text: 'Every item needs a product.' });
        if (!item.quantity || Number(item.quantity) <= 0) return setMessage({ type: 'error', text: 'Every item quantity must be greater than zero.' });
        if (seen.has(item.product_id)) return setMessage({ type: 'error', text: 'The same product cannot be entered more than once.' });
        seen.add(item.product_id);
      }
      payloadItems = movementItems.map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity) }));
    }
    try {
      await mutation.mutateAsync({ operation_id: crypto.randomUUID(), movement_type: production ? 'production' : movementType,
        ...(production ? { product_id: productId, quantity: Number(quantity) } : { items: payloadItems }), occurred_at: date,
        reason_comment: reason, batch_reference: production ? batchReference : undefined,
        input_quantity: production && inputQuantity ? Number(inputQuantity) : undefined, input_unit: production ? inputUnit : undefined });
      setMessage({ type: 'success', text: production ? 'Production recorded successfully.' : 'Factory movement recorded successfully.' });
      setProductId(''); setQuantity(''); setMovementItems([{ product_id: '', quantity: '' }]); setReason(''); setBatchReference(''); setInputQuantity(''); setInputUnit('');
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save factory record.' }); }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
    {message ? <NotificationBanner type={message.type} message={message.text} /> : null}
    {productsQuery.isLoading ? <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Loading products...</p> : null}
    {productsQuery.isError ? <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">Unable to load products. Please try again.</p> : null}
    <label className="block text-sm text-slate-700">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
    {!production ? <>
      <fieldset className="space-y-3"><legend className="text-sm font-medium text-slate-700">Items</legend>{movementItems.map((item, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <label className="block text-sm text-slate-700">Product<select value={item.product_id} onChange={(e) => updateMovementItem(index, 'product_id', e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"><option value="">Select product</option>{products.filter((p) => p.active && (p.product_id === item.product_id || !movementItems.some((other, otherIndex) => otherIndex !== index && other.product_id === p.product_id))).map((p) => <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.unit})</option>)}</select></label>
        <label className="block text-sm text-slate-700">Quantity<input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => updateMovementItem(index, 'quantity', e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
        {movementItems.length > 1 ? <button type="button" onClick={() => removeMovementItem(index)} className="rounded-3xl px-3 py-3 text-sm text-rose-700 hover:bg-rose-50">Remove</button> : <span />}
      </div>)}</fieldset>
      <button type="button" onClick={addMovementItem} className="rounded-3xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">+ Add Item</button>
      <label className="block text-sm text-slate-700">Movement type<select value={movementType} onChange={(e) => setMovementType(e.target.value as FactoryMovementType)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"><option value="leaving_factory">Leaving Factory</option><option value="returned_factory">Returned to Factory</option></select></label>
    </> : <>
      <label className="block text-sm text-slate-700">Product<select value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"><option value="">Select product</option>{products.filter((p) => p.active).map((p) => <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.unit})</option>)}</select></label>
      <label className="block text-sm text-slate-700">Finished quantity<input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
      <label className="block text-sm text-slate-700">Batch/reference<input type="text" value={batchReference} onChange={(e) => setBatchReference(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-700">Groundnut input quantity<input type="number" min="0" step="0.001" value={inputQuantity} onChange={(e) => setInputQuantity(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label><label className="block text-sm text-slate-700">Groundnut input unit<input type="text" value={inputUnit} onChange={(e) => setInputUnit(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label></div>
    </>}
    <label className="block text-sm text-slate-700">{production ? 'Notes' : 'Reason / Comment'}<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
    <Button type="submit" disabled={mutation.isPending || productsQuery.isError}>{mutation.isPending ? 'Saving...' : production ? 'Record production' : 'Record movement'}</Button>
  </form>;
}
