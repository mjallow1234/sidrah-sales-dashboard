'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateDeliveryPaymentOptionMutation, useDeliveryPaymentOptionsQuery, useUpdateDeliveryPaymentOptionMutation } from '@/lib/hooks/deliveryPaymentQueries';

export function PaymentOptionManagement() {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const options = useDeliveryPaymentOptionsQuery(true);
  const create = useCreateDeliveryPaymentOptionMutation();
  const update = useUpdateDeliveryPaymentOptionMutation();

  async function addOption() {
    setMessage(null);
    try {
      await create.mutateAsync(name.trim());
      setName('');
      setMessage('Payment option added.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function saveOption(id: string) {
    setMessage(null);
    try {
      await update.mutateAsync({ id, payload: { name: editingName.trim() } });
      setEditingId(null);
      setMessage('Payment option updated.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function toggleOption(id: string, isActive: boolean) {
    setMessage(null);
    try {
      await update.mutateAsync({ id, payload: { is_active: !isActive } });
      setMessage(isActive ? 'Payment option deactivated.' : 'Payment option activated.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sidrah-500">Administration</p>
        <h1 className="mt-2 text-2xl font-semibold">Delivery Payment Options</h1>
        <p className="mt-2 text-sm text-slate-600">Manage methods available when recording delivery payments. Deactivated methods remain visible in payment history.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New payment option" className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" />
        <Button type="button" disabled={!name.trim() || create.isPending} onClick={addOption}>Add option</Button>
      </div>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      {options.isLoading ? <p className="text-sm text-slate-500">Loading payment options…</p> : null}
      {options.isError ? <p className="text-sm text-rose-600">Unable to load payment options.</p> : null}
      <div className="space-y-2">
        {(options.data ?? []).map((option) => (
          <div key={option.payment_option_id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
            {editingId === option.payment_option_id ? (
              <input value={editingName} onChange={(event) => setEditingName(event.target.value)} className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            ) : (
              <span className={`font-medium ${option.is_active ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{option.name}</span>
            )}
            <div className="flex flex-wrap gap-2">
              {editingId === option.payment_option_id ? (
                <>
                  <Button type="button" onClick={() => saveOption(option.payment_option_id)} disabled={!editingName.trim() || update.isPending}>Save</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="secondary" onClick={() => { setEditingId(option.payment_option_id); setEditingName(option.name); }}>Edit</Button>
                  <Button type="button" variant="secondary" onClick={() => toggleOption(option.payment_option_id, option.is_active)} disabled={update.isPending}>{option.is_active ? 'Deactivate' : 'Activate'}</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
