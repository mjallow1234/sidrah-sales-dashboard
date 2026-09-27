'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthQuery } from '@/lib/hooks/queries';
import { useAccountabilityHandoverHistory, useAccountabilityManagementSummary } from '@/lib/hooks/accountabilityQueries';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import type { AgentCashHandoverRecord } from '@/lib/types';

type HandoverFormState = { agent: string; amount: string; receiver: string; notes: string };

function money(value: number) { return `D${Number(value || 0).toLocaleString()}`; }

export default function AccountabilityPage() {
  const auth = useAuthQuery();
  const management = isAdminOrSupervisorRole(auth.data?.role);
  const summary = useAccountabilityManagementSummary(management);
  const handovers = useAccountabilityHandoverHistory(management);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [form, setForm] = useState<HandoverFormState>({ agent: '', amount: '', receiver: '', notes: '' });
  const [message, setMessage] = useState('');
  const [selectedHandover, setSelectedHandover] = useState<AgentCashHandoverRecord | null>(null);

  const rows = useMemo(() => (summary.data ?? []).filter((row) => {
    const matchesQuery = row.agent_name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = status === 'all' || row.cash_status === status;
    return matchesQuery && matchesStatus;
  }), [query, status, summary.data]);

  useEffect(() => {
    if (summary.error) setMessage(summary.error.message);
  }, [summary.error]);

  if (!management) return <div className="p-6 text-slate-600">Management accountability is restricted to authorized users.</div>;

  const recordHandover = async () => {
    if (!form.agent || !form.amount) return;
    setMessage('');
    const response = await fetch('/api/accountability/cash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_user_id: form.agent, amount: Number(form.amount), company_receiver: form.receiver, notes: form.notes }) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.message || 'Unable to record handover.'); return; }
    setMessage(`Recorded ${payload.data.status}. Outstanding: ${money(payload.data.outstanding)}`);
    setForm((current) => ({ ...current, amount: '', receiver: '', notes: '' }));
    await Promise.all([summary.refetch(), handovers.refetch()]);
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm uppercase tracking-[0.2em] text-sidrah-600">Management</p><h1 className="text-2xl font-semibold text-slate-900">Agent Accountability</h1><p className="mt-1 text-sm text-slate-600">Trace stock, collections, returns, transfers, and company handovers without changing vendor accounting.</p></div>
        <Button type="button" variant="secondary" onClick={() => { summary.refetch(); handovers.refetch(); }}>Refresh</Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Agents</p><p className="mt-2 text-2xl font-semibold">{summary.data?.length ?? 0}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Outstanding Cash</p><p className="mt-2 text-2xl font-semibold text-rose-600">{money((summary.data ?? []).reduce((total, row) => total + Math.max(0, row.cash_outstanding), 0))}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Active Stock</p><p className="mt-2 text-2xl font-semibold">{money((summary.data ?? []).reduce((total, row) => total + row.stock_accountability, 0))}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Active Cases</p><p className="mt-2 text-2xl font-semibold">{(summary.data ?? []).reduce((total, row) => total + row.active_case_count, 0)}</p></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Agents</h2><p className="text-sm text-slate-500">Select an agent to see the cases that make up the totals.</p></div><div className="flex flex-wrap gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"><option value="all">All statuses</option><option value="outstanding">Outstanding</option><option value="reconciled">Reconciled</option><option value="excess">Excess</option></select></div></div>
        {summary.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading agent accountability…</p> : null}
        {summary.error ? <p className="mt-4 text-sm text-rose-600">Unable to load agent accountability.</p> : null}
        {!summary.isLoading && !summary.error && rows.length === 0 ? <p className="mt-4 text-sm text-slate-500">No agents match the current filters.</p> : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{rows.map((row) => <Link key={row.agent_user_id} href={`/accountability/agents/${encodeURIComponent(row.agent_user_id)}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-sidrah-300 hover:bg-sidrah-50 focus:outline-none focus:ring-2 focus:ring-sidrah-300"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{row.agent_name}</p><p className="mt-1 text-xs text-slate-500">{row.active_case_count} active case{row.active_case_count === 1 ? '' : 's'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${row.cash_status === 'outstanding' ? 'bg-rose-100 text-rose-700' : row.cash_status === 'excess' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>Cash {row.cash_status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-slate-500">Pending stock</p><p className="font-semibold">{money(row.pending_stock_accountability)}</p></div><div><p className="text-xs text-slate-500">Active stock</p><p className="font-semibold">{money(row.stock_accountability)}</p></div><div><p className="text-xs text-slate-500">Stock returned</p><p className="font-semibold">{money(row.stock_returned)}</p></div><div><p className="text-xs text-slate-500">Cash collected</p><p className="font-semibold">{money(row.cash_collected)}</p></div><div><p className="text-xs text-slate-500">Cash handed over</p><p className="font-semibold">{money(row.cash_handed_over)}</p></div><div><p className="text-xs text-slate-500">Cash outstanding</p><p className="font-semibold">{money(row.cash_outstanding)}</p></div></div></Link>)}</div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><h2 className="text-lg font-semibold">Record company cash handover</h2><p className="mt-1 text-sm text-slate-600">Only management can record handovers. Original vendor collections remain unchanged.</p><div className="mt-4 grid gap-3 md:grid-cols-4"><select value={form.agent} onChange={(event) => setForm((current) => ({ ...current, agent: event.target.value }))} className="rounded-2xl border px-3 py-2"><option value="">Accountable agent</option>{summary.data?.map((row) => <option key={row.agent_user_id} value={row.agent_user_id}>{row.agent_name}</option>)}</select><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" className="rounded-2xl border px-3 py-2" /><input value={form.receiver} onChange={(event) => setForm((current) => ({ ...current, receiver: event.target.value }))} placeholder="Company receiver" className="rounded-2xl border px-3 py-2" /><input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes/reason" className="rounded-2xl border px-3 py-2" /></div><Button className="mt-3" type="button" disabled={!form.agent || !form.amount} onClick={recordHandover}>Record handover</Button>{message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}</section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><h2 className="text-lg font-semibold">Cash handover history</h2><p className="mt-1 text-sm text-slate-500">Select a row to inspect the recorded handover. The collected total is the agent-wide cumulative total at the time of recording; it is not a case-specific expected amount.</p>{handovers.isLoading ? <p className="mt-3 text-sm text-slate-500">Loading handovers…</p> : null}{!handovers.isLoading && (handovers.data?.length ?? 0) === 0 ? <p className="mt-3 text-sm text-slate-500">No company handovers recorded.</p> : null}<div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b bg-slate-50"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Agent</th><th className="px-3 py-2">Amount handed over</th><th className="px-3 py-2">Collected to date</th><th className="px-3 py-2">Variance</th><th className="px-3 py-2">Receiver</th><th className="px-3 py-2">Recorded by</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{handovers.data?.map((row) => <tr key={row.handover_id} className="cursor-pointer border-b hover:bg-slate-50 focus-within:bg-slate-50" role="button" tabIndex={0} onClick={() => setSelectedHandover(row)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedHandover(row); }}><td className="whitespace-nowrap px-3 py-2">{new Date(row.handover_at).toLocaleString()}</td><td className="px-3 py-2 font-semibold">{row.agent_name}</td><td className="px-3 py-2">{money(row.amount)}</td><td className="px-3 py-2">{money(row.expected_amount)}</td><td className={`px-3 py-2 font-semibold ${row.variance === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{money(row.variance)}</td><td className="px-3 py-2">{row.company_receiver || '—'}</td><td className="px-3 py-2">{row.recorded_by_name || 'Unknown user'}</td><td className="px-3 py-2 capitalize">{row.status}</td></tr>)}</tbody></table></div></section>

      {false ? <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><div><h2 className="text-lg font-semibold">Transfer history</h2><p className="text-sm text-slate-500">Pending and completed accountability transfers.</p></div>{null}</section> : null}
      {selectedHandover ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onClick={() => setSelectedHandover(null)}><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="handover-details-title" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-slate-500">Cash handover</p><h2 id="handover-details-title" className="mt-1 text-xl font-semibold">{selectedHandover.agent_name}</h2></div><button type="button" aria-label="Close handover details" onClick={() => setSelectedHandover(null)} className="rounded-full px-3 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button></div><p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">This handover reconciles collected cash. Product accountability is tracked separately and is not reduced by the handover.</p><dl className="mt-5 grid gap-3 sm:grid-cols-2 text-sm"><div><dt className="text-slate-500">Amount handed over</dt><dd className="font-semibold">{money(selectedHandover.amount)}</dd></div><div><dt className="text-slate-500">Collected to date (agent)</dt><dd className="font-semibold">{money(selectedHandover.expected_amount)}</dd></div><div><dt className="text-slate-500">Variance</dt><dd className="font-semibold">{money(selectedHandover.variance)}</dd></div><div><dt className="text-slate-500">Status</dt><dd className="capitalize">{selectedHandover.status}</dd></div><div><dt className="text-slate-500">Company receiver</dt><dd>{selectedHandover.company_receiver || '—'}</dd></div><div><dt className="text-slate-500">Recorded by</dt><dd>{selectedHandover.recorded_by_name || 'Unknown user'}</dd></div><div><dt className="text-slate-500">Date/time</dt><dd>{new Date(selectedHandover.handover_at).toLocaleString()}</dd></div><div><dt className="text-slate-500">Operation</dt><dd>{selectedHandover.operation_id}</dd></div></dl>{selectedHandover.notes ? <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm">Notes: {selectedHandover.notes}</p> : null}</div></div> : null}
    </main>
  );
}
