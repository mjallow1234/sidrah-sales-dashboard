'use client';

import { useState, type FormEvent } from 'react';
import { useCreateFactoryMovementMutation, useProductsQuery } from '@/lib/hooks/queries';
import { Button } from '@/components/ui/button';
import { NotificationBanner } from '@/components/ui/notification';

export function FactoryProductionForm() {
  const productsQuery = useProductsQuery();
  const mutation = useCreateFactoryMovementMutation();
  const [rawMaterial, setRawMaterial] = useState('');
  const [batchReference, setBatchReference] = useState('');
  const [weight, setWeight] = useState('');
  const [temperature, setTemperature] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [productId, setProductId] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const hour = Number(hours);
    const minute = Number(minutes);
    if (!rawMaterial.trim()) return setMessage({ type: 'error', text: 'Raw Material is required.' });
    if (!batchReference.trim()) return setMessage({ type: 'error', text: 'Batch No. is required.' });
    if (!weight || Number(weight) <= 0) return setMessage({ type: 'error', text: 'Weight (kg) must be greater than zero.' });
    if (!temperature || !Number.isFinite(Number(temperature))) return setMessage({ type: 'error', text: 'Temp °C must be a valid number.' });
    if (hours.trim() === '' || !Number.isInteger(hour) || hour < 0) return setMessage({ type: 'error', text: 'Hour must be a non-negative whole number.' });
    if (minutes.trim() === '' || !Number.isInteger(minute) || minute < 0 || minute > 59) return setMessage({ type: 'error', text: 'Minute must be from 0 to 59.' });
    if (!productId) return setMessage({ type: 'error', text: 'Finished Product is required.' });
    if (!outputQuantity || Number(outputQuantity) <= 0) return setMessage({ type: 'error', text: 'Output Quantity must be greater than zero.' });

    try {
      await mutation.mutateAsync({
        operation_id: crypto.randomUUID(),
        movement_type: 'production',
        product_id: productId,
        quantity: Number(outputQuantity),
        raw_material: rawMaterial.trim(),
        batch_reference: batchReference.trim(),
        input_quantity: Number(weight),
        input_unit: 'kg',
        temperature_c: Number(temperature),
        processing_duration_hours: hour,
        processing_duration_minutes: minute,
      });
      setMessage({ type: 'success', text: 'Production recorded successfully.' });
      setRawMaterial(''); setBatchReference(''); setWeight(''); setTemperature(''); setHours(''); setMinutes(''); setProductId(''); setOutputQuantity('');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save production record.' });
    }
  }

  const products = productsQuery.data ?? [];
  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      {message ? <NotificationBanner type={message.type} message={message.text} /> : null}
      {productsQuery.isLoading ? <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Loading products...</p> : null}
      {productsQuery.isError ? <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">Unable to load finished products. Please try again.</p> : null}
      <label className="block text-sm text-slate-700">Raw Material<input type="text" value={rawMaterial} onChange={(event) => setRawMaterial(event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
      <label className="block text-sm text-slate-700">Batch No.<input type="text" value={batchReference} onChange={(event) => setBatchReference(event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
      <label className="block text-sm text-slate-700">Weight (kg)<input type="number" min="0.001" step="0.001" value={weight} onChange={(event) => setWeight(event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
      <label className="block text-sm text-slate-700">Temp °C<input type="number" step="0.01" value={temperature} onChange={(event) => setTemperature(event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label>
      <fieldset className="space-y-2"><legend className="text-sm text-slate-700">Time</legend><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-700">Hour<input type="number" min="0" step="1" value={hours} onChange={(event) => setHours(event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label><label className="block text-sm text-slate-700">Minute<input type="number" min="0" max="59" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label></div></fieldset>
      <fieldset className="space-y-4"><legend className="text-sm text-slate-700">Output</legend><label className="block text-sm text-slate-700">Finished Product<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"><option value="">Select finished product</option>{products.filter((product) => product.active).map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name} ({product.unit})</option>)}</select></label><label className="block text-sm text-slate-700">Output Quantity<input type="number" min="0.001" step="0.001" value={outputQuantity} onChange={(event) => setOutputQuantity(event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none" /></label></fieldset>
      <Button type="submit" disabled={mutation.isPending || productsQuery.isError} className="w-full">{mutation.isPending ? 'Saving...' : 'Record production'}</Button>
    </form>
  );
}
