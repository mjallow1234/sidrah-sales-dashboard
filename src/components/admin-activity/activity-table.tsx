'use client';

import type { AdminActivityRecord } from '@/lib/types';

interface ActivityTableProps {
  activities: AdminActivityRecord[];
  onSelect: (activity: AdminActivityRecord) => void;
}

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
  )}`;
}

function renderMovement(activity: AdminActivityRecord) {
  if (activity.action_type === 'transfer') {
    return (
      <span className="text-slate-700">
        {activity.source_vendor_name ?? activity.source_vendor_id} → {activity.destination_vendor_name ?? activity.destination_vendor_id}
      </span>
    );
  }
  if (activity.action_type === 'retrieval') {
    return (
      <span className="text-slate-700">
        {activity.vendor_name ?? activity.vendor_id} → Company
      </span>
    );
  }
  return (
    <span className="text-slate-700">
      Original Visit {activity.original_visit_date || ''}
    </span>
  );
}

export function ActivityTable({ activities, onSelect }: ActivityTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="grid grid-cols-5 gap-4 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">
        <div>Date / time</div>
        <div>Action</div>
        <div>Admin</div>
        <div>Product</div>
        <div className="text-right">Details</div>
      </div>
      <div className="divide-y divide-slate-200">
        {activities.map((activity) => (
          <button
            type="button"
            key={activity.operation_id}
            onClick={() => onSelect(activity)}
            className="w-full text-left transition hover:bg-slate-50"
          >
            <div className="grid grid-cols-5 gap-4 px-4 py-4 text-sm text-slate-700 items-center">
              <div>{formatTimestamp(activity.timestamp)}</div>
              <div className="capitalize">{activity.action_type}</div>
              <div>{activity.admin_name}</div>
              <div>{activity.product_name || activity.product_id}</div>
              <div className="text-right text-sidrah-600">View</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
