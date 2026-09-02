'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useAuthQuery,
  useCancelDeliveryMutation,
  useClaimDeliveryMutation,
  useDeliveryQuery,
  useDeliveryUsersQuery,
  useMarkDeliveryDeliveredMutation,
  useReassignDeliveryMutation,
} from '@/lib/hooks/queries';

interface DeliveryDetailsProps {
  deliveryId: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  ongoing: 'Ongoing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusClassNames: Record<string, string> = {
  pending: 'bg-rose-100 text-rose-700',
  ongoing: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};

export function DeliveryDetails({ deliveryId }: DeliveryDetailsProps) {
  const authQuery = useAuthQuery();
  const { data: delivery, isLoading, isError } = useDeliveryQuery(deliveryId);
  const claimMutation = useClaimDeliveryMutation();
  const deliverMutation = useMarkDeliveryDeliveredMutation();
  const reassignMutation = useReassignDeliveryMutation();
  const cancelMutation = useCancelDeliveryMutation();

  const currentUserId = authQuery.data?.userId ?? '';
  const currentRole = authQuery.data?.role;
  const isDeliveryUser = currentRole === 'delivery';
  const isAdminOrSupervisor = currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'supervisor';

  const isActionable = delivery?.status === 'pending' || delivery?.status === 'ongoing';
  const canClaim = isDeliveryUser && delivery?.status === 'pending';
  const canDeliverSelf = isDeliveryUser && delivery?.status === 'ongoing' && delivery?.claimed_by === currentUserId;
  const canCompleteAsAdmin = isAdminOrSupervisor && isActionable;
  const canMarkDelivered = canDeliverSelf || canCompleteAsAdmin;
  const canReassign = isAdminOrSupervisor && isActionable;
  const canCancel = isAdminOrSupervisor && isActionable;

  const { data: deliveryUsers = [] } = useDeliveryUsersQuery(canReassign);
  const [reassignTarget, setReassignTarget] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const assignedToLabel = useMemo(() => {
    if (!delivery?.claimed_by) {
      return 'Unassigned';
    }
    return delivery.claimed_by_name || 'Unknown user';
  }, [delivery]);

  if (isLoading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">Loading delivery details…</div>;
  }

  if (isError || !delivery) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">Unable to load delivery details.</div>;
  }

  const handleReassign = () => {
    if (!reassignTarget) {
      return;
    }
    reassignMutation.mutate({ deliveryId: delivery.delivery_id, deliveryUserId: reassignTarget });
  };

  const handleCancel = () => {
    cancelMutation.mutate({ deliveryId: delivery.delivery_id });
    setShowCancelConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Delivery details</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{delivery.customer_name}</h1>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <div>
              Status:{' '}
              <span className={`inline-flex px-2 py-1 text-xs font-semibold capitalize ${statusClassNames[delivery.status] ?? ''}`}>
                {statusLabels[delivery.status] ?? delivery.status}
              </span>
            </div>
            <div>Created: {new Date(delivery.date_created).toLocaleString()}</div>
            <div>Created by: {delivery.created_by_name || 'Unknown user'}</div>
            <div>Assigned to: {assignedToLabel}</div>
            {delivery.claimed_at ? <div>Claimed at: {new Date(delivery.claimed_at).toLocaleString()}</div> : null}
            {delivery.delivered_at ? <div>Delivered at: {new Date(delivery.delivered_at).toLocaleString()}</div> : null}
            {delivery.status === 'cancelled' ? (
              <>
                {delivery.cancelled_at ? <div>Cancelled at: {new Date(delivery.cancelled_at).toLocaleString()}</div> : null}
                <div>Cancelled by: {delivery.cancelled_by_name || 'Unknown user'}</div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Customer</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <p className="font-semibold text-slate-900">Phone</p>
              <p>{delivery.customer_phone}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Address</p>
              <p>{delivery.delivery_address}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Items</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {delivery.items.map((item, index) => (
              <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{item.product_name || item.description || 'Unknown product'}{item.sku ? ` (${item.sku})` : ''}</p>
                <p>Quantity: {item.quantity}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
        <p className="mt-4 text-sm text-slate-700">{delivery.notes ?? 'No additional notes.'}</p>
      </div>

      {canReassign ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Assign to delivery user</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={reassignTarget}
              onChange={(event) => setReassignTarget(event.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none sm:max-w-xs"
            >
              <option value="">Select delivery user</option>
              {deliveryUsers.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name || user.username}
                </option>
              ))}
            </select>
            <Button type="button" onClick={handleReassign} disabled={!reassignTarget || reassignMutation.isPending}>
              {reassignMutation.isPending ? 'Assigning…' : 'Assign / Reassign'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {canClaim ? (
          <Button type="button" onClick={() => claimMutation.mutate({ deliveryId: delivery.delivery_id })} disabled={claimMutation.isPending}>
            {claimMutation.isPending ? 'Claiming…' : 'Claim Delivery'}
          </Button>
        ) : null}
        {canMarkDelivered ? (
          <Button type="button" onClick={() => deliverMutation.mutate({ deliveryId: delivery.delivery_id })} disabled={deliverMutation.isPending}>
            {deliverMutation.isPending ? 'Marking…' : 'Mark as Delivered'}
          </Button>
        ) : null}
        {canCancel ? (
          showCancelConfirm ? (
            <div className="flex items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3">
              <span className="text-sm font-semibold text-rose-700">Cancel this delivery?</span>
              <Button type="button" variant="secondary" onClick={() => setShowCancelConfirm(false)}>
                Keep Delivery
              </Button>
              <Button type="button" onClick={handleCancel} disabled={cancelMutation.isPending}>
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Delivery'}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setShowCancelConfirm(true)}>
              Cancel Delivery
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
