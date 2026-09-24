'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDecideVendorLocationRequestMutation, usePendingVendorLocationRequestsQuery } from '@/lib/hooks/vendorLocationQueries';

export function VendorLocationRequests() {
  const requests = usePendingVendorLocationRequestsQuery();
  const decide = useDecideVendorLocationRequestMutation();
  const [reason, setReason] = useState<Record<string, string>>({});
  if (requests.isLoading) return <p className="text-sm text-slate-500">Loading location requests…</p>;
  if (requests.isError) return <p className="text-sm text-rose-600">Unable to load location requests.</p>;
  if (!requests.data?.length) return <p className="text-sm text-slate-500">No pending location requests.</p>;
  return <div className="space-y-4">{requests.data.map((request) => <article key={request.request_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/vendors/${request.vendor_id}`} className="font-semibold text-sidrah-700 hover:underline">{request.vendor_name || request.vendor_id}</Link><p className="mt-1 text-sm text-slate-600">Requested by {request.requested_by_name || 'Unknown user'} on {new Date(request.requested_at).toLocaleString()}</p></div><div className="text-right text-sm"><p className="text-slate-600">Existing: {request.current_latitude == null || request.current_longitude == null ? 'None' : `${request.current_latitude.toFixed(7)}, ${request.current_longitude.toFixed(7)}`}</p><p className="font-semibold text-slate-900">Proposed: {request.proposed_latitude.toFixed(7)}, {request.proposed_longitude.toFixed(7)}</p></div></div><div className="mt-4 flex flex-wrap items-end gap-3"><Button type="button" onClick={() => decide.mutate({ requestId: request.request_id, action: 'approve' })} disabled={decide.isPending}>Approve</Button><div><label className="block text-xs font-semibold text-slate-600">Rejection reason</label><input value={reason[request.request_id] ?? ''} onChange={(event) => setReason((current) => ({ ...current, [request.request_id]: event.target.value }))} className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" /></div><Button type="button" variant="secondary" onClick={() => decide.mutate({ requestId: request.request_id, action: 'reject', reason: reason[request.request_id] })} disabled={decide.isPending || !reason[request.request_id]?.trim()}>Reject</Button></div></article>)}</div>;
}
