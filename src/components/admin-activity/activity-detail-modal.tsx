'use client';

import type { AdminActivityRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';

function formatTimestamp(timestamp: string | undefined | null) {
  if (!timestamp) {
    return 'Unknown';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0',
  )}:${String(date.getSeconds()).padStart(2, '0')}`;
}

interface ActivityDetailModalProps {
  activity: AdminActivityRecord | null;
  onClose: () => void;
}

function renderMovementLine(activity: AdminActivityRecord) {
  if (activity.action_type === 'transfer') {
    return (
      <div className="space-y-1">
        <p className="text-sm text-slate-500">Movement</p>
        <p className="font-semibold text-slate-900">{activity.source_vendor_name ?? activity.source_vendor_id} → {activity.destination_vendor_name ?? activity.destination_vendor_id}</p>
      </div>
    );
  }
  if (activity.action_type === 'retrieval') {
    return (
      <div className="space-y-1">
        <p className="text-sm text-slate-500">Movement</p>
        <p className="font-semibold text-slate-900">{activity.vendor_name ?? activity.vendor_id} → Company</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-500">Movement</p>
      <p className="font-semibold text-slate-900">Original Visit → Reversed</p>
    </div>
  );
}

export function ActivityDetailModal({ activity, onClose }: ActivityDetailModalProps) {
  if (!activity) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Admin activity</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{activity.action_type === 'reversal' ? 'Visit reversal' : activity.action_type === 'retrieval' ? 'Stock retrieval' : 'Stock transfer'}</h2>
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-slate-500">When</p>
              <p className="font-semibold text-slate-900">{formatTimestamp(activity.timestamp)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Admin</p>
              <p className="font-semibold text-slate-900">{activity.admin_name} ({activity.admin_id})</p>
            </div>
          </div>

          {renderMovementLine(activity)}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Product</p>
              <p className="font-semibold text-slate-900">{activity.product_name || activity.product_id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Quantity</p>
              <p className="font-semibold text-slate-900">{activity.quantity}</p>
            </div>
          </div>

          {activity.action_type === 'reversal' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Original visit</p>
                <p className="font-semibold text-slate-900">{formatTimestamp(activity.original_visit_timestamp)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Sales rep / actor</p>
                <p className="font-semibold text-slate-900">{activity.original_actor || activity.original_sales_rep_name || activity.original_sales_rep_id || 'Unknown'}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-sm text-slate-500">Reason / notes</p>
            <p className="whitespace-pre-wrap text-slate-900">{activity.notes || activity.reversal_reason || 'None provided'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-slate-500">Operation ID</p>
            <p className="font-semibold text-slate-900">{activity.operation_id}</p>
          </div>

          {activity.action_type === 'reversal' ? (
            <div className="space-y-1">
              <p className="text-sm text-slate-500">Status</p>
              <p className="font-semibold text-sidrah-700">Reversed</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
