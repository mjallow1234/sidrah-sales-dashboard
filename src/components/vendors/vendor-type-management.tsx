'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateVendorTypeMutation, useDeleteVendorTypeMutation, useVendorTypesQuery } from '@/lib/hooks/vendorManagementQueries';

export function VendorTypeManagement() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const types = useVendorTypesQuery();
  const create = useCreateVendorTypeMutation();
  const remove = useDeleteVendorTypeMutation();
  async function add() {
    setMessage(null);
    try { await create.mutateAsync(name.trim()); setName(''); setMessage('Vendor type added.'); } catch (error) { setMessage((error as Error).message); }
  }
  return <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
    <div><p className="text-sm uppercase tracking-[0.2em] text-sidrah-500">Administration</p><h1 className="mt-2 text-2xl font-semibold">Vendor Types</h1><p className="mt-2 text-sm text-slate-600">Manage the types available on vendor forms.</p></div>
    <div className="flex flex-col gap-2 sm:flex-row"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New vendor type" className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" /><Button type="button" disabled={!name.trim() || create.isPending} onClick={add}>Add type</Button></div>
    {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    {types.isLoading ? <p className="text-sm text-slate-500">Loading vendor types…</p> : <div className="space-y-2">{(types.data ?? []).map((type) => <div key={type.vendor_type_id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"><span className="font-medium">{type.name}</span><button type="button" className="text-sm font-semibold text-rose-600 disabled:opacity-50" disabled={remove.isPending} onClick={async () => { try { await remove.mutateAsync(type.vendor_type_id); setMessage('Vendor type deleted.'); } catch (error) { setMessage((error as Error).message); } }}>Delete</button></div>)}</div>}
    <p className="text-xs text-slate-500">Types already used by a vendor cannot be deleted.</p>
  </section>;
}
