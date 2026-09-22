'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAcquiredByAgentsQuery, useAddAcquiredByAgentMutation, useRemoveAcquiredByAgentMutation } from '@/lib/hooks/vendorManagementQueries';

export function AcquiredByManagement() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const available = useAcquiredByAgentsQuery();
  const add = useAddAcquiredByAgentMutation();
  const remove = useRemoveAcquiredByAgentMutation();
  async function addAgent() { if (!name.trim()) return; try { await add.mutateAsync(name.trim()); setName(''); setMessage('Acquired By name added.'); } catch (error) { setMessage((error as Error).message); } }
  return <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
    <div><p className="text-sm uppercase tracking-[0.2em] text-sidrah-500">Administration</p><h1 className="mt-2 text-2xl font-semibold">Acquired By</h1><p className="mt-2 text-sm text-slate-600">Manage standalone names for the person who acquired a vendor. These names are independent of Sales Representatives and user accounts.</p></div>
    <div className="flex flex-col gap-2 sm:flex-row"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acquired By name" className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3" /><Button type="button" disabled={!name.trim() || add.isPending} onClick={addAgent}>Add</Button></div>
    {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    <div className="space-y-2">{(available.data ?? []).map((agent) => <div key={agent.acquired_by_id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"><p className="font-medium">{agent.name}</p><button type="button" className="text-sm font-semibold text-rose-600" disabled={remove.isPending} onClick={async () => { try { await remove.mutateAsync(agent.acquired_by_id); setMessage('Name removed from new Acquired By selections. Existing vendors are unchanged.'); } catch (error) { setMessage((error as Error).message); } }}>Remove</button></div>)}</div>
  </section>;
}
