'use client';
import Link from 'next/link';
import { useState } from 'react';
import { LeadForm } from './lead-form';
import { useAddCrmLeadActivityMutation, useCrmLeadActivitiesQuery, useCrmLeadQuery, useUpdateCrmLeadMutation } from '@/lib/hooks/crmLeadQueries';
import { useEffectivePermissionQuery } from '@/lib/hooks/userQueries';

export function LeadDetail({ leadId }: { leadId: string }) {
  const leadQuery = useCrmLeadQuery(leadId);
  const activities = useCrmLeadActivitiesQuery(leadId);
  const add = useAddCrmLeadActivityMutation();
  const update = useUpdateCrmLeadMutation();
  const statusPermission = useEffectivePermissionQuery('crm.status.change');
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  if (leadQuery.isLoading) return <p>Loading lead...</p>;
  if (leadQuery.isError || !leadQuery.data) return <p role="alert" className="text-rose-700">Lead unavailable.</p>;
  const lead = leadQuery.data;
  function dateAfter(days: number) { const current = new Date(); current.setDate(current.getDate() + days); return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`; }
  async function changeStatus(status: 'converted' | 'lost') { await update.mutateAsync({ leadId, payload: { status } }); }
  async function recordActivity(event?: React.FormEvent, complete = false) {
    event?.preventDefault();
    if (!note.trim()) return;
    await add.mutateAsync({ leadId, payload: { activity_type: 'follow_up', note, follow_up_date: complete ? null : (followUpDate || undefined) } });
    setNote('');
    setFollowUpDate('');
  }
  return <div className="space-y-5">
    {editing ? <LeadForm lead={lead} onDone={() => setEditing(false)} /> : <>
      <div className="rounded-3xl border bg-white p-5 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm uppercase tracking-[0.2em] text-sidrah-500">CRM Lead</p><h1 className="mt-2 text-2xl font-semibold">{lead.lead_name}</h1></div><button type="button" onClick={() => setEditing(true)} className="rounded-2xl border px-4 py-2 font-semibold">Edit</button></div><div className="mt-5 flex flex-wrap gap-2"><a href={lead.phone ? `tel:${lead.phone}` : undefined} aria-disabled={!lead.phone} className="rounded-2xl border px-3 py-2 text-sm font-semibold">Call</a><a href={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}` : undefined} target="_blank" rel="noreferrer" aria-disabled={!lead.phone} className="rounded-2xl border px-3 py-2 text-sm font-semibold">WhatsApp</a>{statusPermission.data !== false ? <><button type="button" disabled={update.isPending} onClick={() => changeStatus('converted')} className="rounded-2xl border px-3 py-2 text-sm font-semibold">Convert</button><button type="button" disabled={update.isPending} onClick={() => changeStatus('lost')} className="rounded-2xl border px-3 py-2 text-sm font-semibold">Mark Lost</button></> : null}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><p><b>Phone:</b> {lead.phone || 'Not specified'}</p><p><b>Location:</b> {lead.location || 'Not specified'}</p><p><b>Business type:</b> {lead.business_type || 'Not specified'}</p><p><b>Lead source:</b> {lead.lead_source || 'Not specified'}</p><p><b>Assigned agent:</b> {lead.assigned_agent_name || 'Unassigned'}</p><p><b>Status:</b> {lead.status.replace(/_/g, ' ')}</p><p><b>Captured:</b> {lead.captured_at}</p><p><b>Next follow-up:</b> {lead.next_follow_up_date || 'Not scheduled'}</p></div><p className="mt-4 whitespace-pre-wrap text-slate-700">{lead.notes || 'No notes.'}</p></div>
      <form onSubmit={event => recordActivity(event)} className="rounded-3xl border bg-white p-5 shadow-soft"><h2 className="font-semibold">Follow-up activity</h2><textarea required value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What happened?" className="mt-3 w-full rounded-2xl border p-3" /><div className="mt-3 flex flex-wrap gap-2 text-sm"><span className="self-center">Next date:</span><button type="button" onClick={() => setFollowUpDate(dateAfter(2))} className="rounded-xl border px-2 py-1">+2 days</button><button type="button" onClick={() => setFollowUpDate(dateAfter(3))} className="rounded-xl border px-2 py-1">+3 days</button><button type="button" onClick={() => setFollowUpDate(dateAfter(4))} className="rounded-xl border px-2 py-1">+4 days</button><input aria-label="Custom next follow-up date" type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="rounded-xl border p-2" /></div><div className="mt-3 flex flex-wrap gap-2"><button disabled={add.isPending} className="rounded-2xl bg-sidrah-500 px-4 py-3 font-semibold text-white">Record follow-up</button><button type="button" disabled={add.isPending} onClick={() => recordActivity(undefined, true)} className="rounded-2xl border px-4 py-3 font-semibold">Mark follow-up completed</button></div></form>
    </>}
    {activities.isLoading ? <p>Loading history...</p> : <div className="rounded-3xl border bg-white p-5 shadow-soft"><h2 className="font-semibold">Activity history</h2><div className="mt-4 space-y-3">{(activities.data ?? []).map(item => <div key={item.activity_id} className="border-b pb-3 last:border-0"><p className="font-semibold capitalize">{item.activity_type.replace(/_/g, ' ')}</p><p className="text-sm text-slate-600">{item.activity_at} · {item.actor_name || item.actor_user_id}</p>{item.note ? <p className="mt-1 whitespace-pre-wrap text-sm">{item.note}</p> : null}</div>)}</div></div>}
    <Link href="/crm/leads" className="inline-block text-sm font-semibold text-sidrah-700">Back to leads</Link>
  </div>;
}
