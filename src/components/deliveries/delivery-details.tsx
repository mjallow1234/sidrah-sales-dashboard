'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useAuthQuery,
  useAddDeliveryCommentMutation,
  useAddDeliveryItemsMutation,
  useCancelDeliveryMutation,
  useClaimDeliveryMutation,
  useDeliveryQuery,
  useDeliveryActivityQuery,
  useDeliveryAccountabilityQuery,
  useRecordAccountabilityCollectionMutation,
  useRecordAccountabilityReturnMutation,
  useDeliveryUsersQuery,
  useMarkDeliveryDeliveredMutation,
  useReassignDeliveryMutation,
  useProductsQuery,
} from '@/lib/hooks/queries';
import { useAccountabilityPaymentOptionsQuery, useDeliveryPaymentOptionsQuery, useDeliveryPaymentsQuery, useRecordDeliveryPaymentMutation } from '@/lib/hooks/deliveryPaymentQueries';
import { canRecordDeliveryPayment } from '@/lib/authorization';
import type { DeliveryItem } from '@/lib/types';
import { DeliveryLocationReporter } from './delivery-location-reporter';
import { DeliveryNavigationActions } from './delivery-navigation-actions';

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

const priorityLabels: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export function DeliveryDetails({ deliveryId }: DeliveryDetailsProps) {
  const authQuery = useAuthQuery();
  const { data: delivery, isLoading, isError } = useDeliveryQuery(deliveryId);
  const { data: activities = [], isLoading: activitiesLoading } = useDeliveryActivityQuery(deliveryId);
  const claimMutation = useClaimDeliveryMutation();
  const deliverMutation = useMarkDeliveryDeliveredMutation();
  const reassignMutation = useReassignDeliveryMutation();
  const cancelMutation = useCancelDeliveryMutation();
  const addCommentMutation = useAddDeliveryCommentMutation();
  const addItemsMutation = useAddDeliveryItemsMutation();
  const recordPaymentMutation = useRecordDeliveryPaymentMutation();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProductsQuery();

  const currentUserId = authQuery.data?.userId ?? '';
  const currentRole = authQuery.data?.role;
  const isDeliveryUser = currentRole === 'delivery';
  const isAdminOrSupervisor = currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'supervisor';
  const paymentOptionsQuery = useDeliveryPaymentOptionsQuery(false, Boolean(currentRole));
  const accountabilityPaymentOptionsQuery = useAccountabilityPaymentOptionsQuery(currentRole === 'agent' || isAdminOrSupervisor);
  const paymentsQuery = useDeliveryPaymentsQuery(deliveryId, Boolean(currentRole));
  const accountabilityQuery = useDeliveryAccountabilityQuery(deliveryId, currentRole === 'agent' || isAdminOrSupervisor);
  const collectionMutation = useRecordAccountabilityCollectionMutation();
  const returnMutation = useRecordAccountabilityReturnMutation();

  const isActionable = delivery?.status === 'pending' || delivery?.status === 'ongoing';
  const canClaim = isDeliveryUser && delivery?.status === 'pending';
  const canDeliverSelf = isDeliveryUser && delivery?.status === 'ongoing' && delivery?.claimed_by === currentUserId;
  const canCompleteAsAdmin = isAdminOrSupervisor && isActionable;
  const canMarkDelivered = canDeliverSelf || canCompleteAsAdmin;
  const canReassign = isAdminOrSupervisor && isActionable;
  const canCancel = isAdminOrSupervisor && isActionable;
  const canAddItems = (currentRole === 'agent' || isAdminOrSupervisor) && isActionable;
  const canRecordPayment = canRecordDeliveryPayment(currentRole);
  const canViewAccountability = currentRole === 'agent' || isAdminOrSupervisor;

  const { data: deliveryUsers = [] } = useDeliveryUsersQuery(canReassign);
  const [reassignTarget, setReassignTarget] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [standaloneComment, setStandaloneComment] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showItemsForm, setShowItemsForm] = useState(false);
  const [additionalItems, setAdditionalItems] = useState([{ product_id: '', quantity: 1 }]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentOptionId, setPaymentOptionId] = useState('');
  const [accountabilityCollectionAmount, setAccountabilityCollectionAmount] = useState('');
  const [accountabilityCollectionOption, setAccountabilityCollectionOption] = useState('');
  const [accountabilityCollectionReason, setAccountabilityCollectionReason] = useState('');
  const [accountabilityReturnProduct, setAccountabilityReturnProduct] = useState('');
  const [accountabilityReturnQuantity, setAccountabilityReturnQuantity] = useState('');
  const [accountabilityReturnReason, setAccountabilityReturnReason] = useState('');

  const assignedToLabel = useMemo(() => {
    if (!delivery?.claimed_by) {
      return 'Unassigned';
    }
    return delivery.claimed_by_name || 'Unknown user';
  }, [delivery]);

  const canAddComment = currentRole === 'agent' || currentRole === 'admin' || currentRole === 'super_admin' || currentRole === 'supervisor' || (currentRole === 'delivery' && (delivery?.status === 'pending' || delivery?.claimed_by === currentUserId));

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
    reassignMutation.mutate({ deliveryId: delivery.delivery_id, deliveryUserId: reassignTarget, comment: actionComment });
  };

  const handleCancel = () => {
    cancelMutation.mutate({ deliveryId: delivery.delivery_id, comment: actionComment });
    setShowCancelConfirm(false);
  };

  const handleAdditionalItemChange = (index: number, field: 'product_id' | 'quantity', value: string) => {
    setAdditionalItems((current) => current.map((item, itemIndex) => itemIndex === index ? {
      ...item,
      [field]: field === 'quantity' ? Number(value) : value,
    } : item));
  };

  const handleAddItems = () => {
    const items: DeliveryItem[] = additionalItems.map((item) => {
      const product = products.find((option) => option.product_id === item.product_id);
      return { product_id: item.product_id, product_name: product?.product_name ?? '', sku: product?.sku, quantity: item.quantity };
    });
    addItemsMutation.mutate({ deliveryId: delivery.delivery_id, items }, {
      onSuccess: () => {
        setAdditionalItems([{ product_id: '', quantity: 1 }]);
        setShowItemsForm(false);
      },
    });
  };

  const handleRecordPayment = () => {
    const amount = Number(paymentAmount);
    if (!paymentOptionId || !Number.isFinite(amount) || amount <= 0) return;
    recordPaymentMutation.mutate({ deliveryId: delivery.delivery_id, amount, paymentOptionId }, {
      onSuccess: () => { setPaymentAmount(''); setPaymentOptionId(''); },
    });
  };

  const handleAccountabilityCollection = () => {
    const amount = Number(accountabilityCollectionAmount);
    if (!accountabilityCollectionOption || !Number.isFinite(amount) || amount <= 0) return;
    collectionMutation.mutate({ deliveryId: delivery.delivery_id, payload: { amount, payment_option_id: accountabilityCollectionOption, operation_id: `AAC_${crypto.randomUUID()}`, reason: accountabilityCollectionReason || undefined } }, { onSuccess: () => { setAccountabilityCollectionAmount(''); setAccountabilityCollectionReason(''); } });
  };

  const handleAccountabilityReturn = () => {
    const quantity = Number(accountabilityReturnQuantity);
    if (!accountabilityReturnProduct || !Number.isFinite(quantity) || quantity <= 0) return;
    returnMutation.mutate({ deliveryId: delivery.delivery_id, payload: { product_id: accountabilityReturnProduct, quantity, operation_id: `AAR_${crypto.randomUUID()}`, reason: accountabilityReturnReason || undefined } }, { onSuccess: () => { setAccountabilityReturnQuantity(''); setAccountabilityReturnReason(''); } });
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
            <div>Priority: <span className="font-semibold">{priorityLabels[delivery.priority] ?? 'Normal'}</span></div>
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
        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="mb-2 text-sm font-semibold text-slate-900">Vendor location</p>
          {isDeliveryUser && delivery.claimed_by === currentUserId ? <DeliveryNavigationActions latitude={delivery.vendor_location_latitude} longitude={delivery.vendor_location_longitude} /> : <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Directions are available to the assigned delivery user.</p>}
        </div>
      </div>

      {canViewAccountability && delivery.accountability_status ? (
        <section className="rounded-3xl border border-sidrah-100 bg-sidrah-50/60 p-6 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sidrah-600">Agent Accountability</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{delivery.accountability_status === 'active' ? 'Active stock accountability' : 'Pending delivery accountability'}</h2>
            </div>
            <p className="text-2xl font-semibold text-sidrah-700">D{Number(delivery.accountability_status === 'active' ? delivery.accountability_active_value ?? 0 : delivery.accountability_pending_value ?? 0).toLocaleString()}</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">Accountable agent: <span className="font-semibold text-slate-900">{delivery.accountable_agent_name || 'Unknown user'}</span></p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Cash collected</p><p className="mt-1 text-xl font-semibold text-slate-900">D{Number(delivery.accountability_cash_collected ?? accountabilityQuery.data?.cash_collected ?? 0).toLocaleString()}</p></div>
            <div className="rounded-2xl bg-white p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Stock returned</p><p className="mt-1 text-xl font-semibold text-slate-900">D{Number(delivery.accountability_stock_returned ?? accountabilityQuery.data?.stock_returned ?? 0).toLocaleString()}</p></div>
            <div className="rounded-2xl bg-white p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">Remaining accountability</p><p className="mt-1 text-xl font-semibold text-slate-900">D{Number(delivery.accountability_remaining_value ?? accountabilityQuery.data?.remaining_value ?? delivery.accountability_active_value ?? 0).toLocaleString()}</p></div>
          </div>
          {delivery.accountability_status === 'active' ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Record accountability collection</p>
                <p className="mt-1 text-xs text-slate-500">Reduces Agent Accountability only. Vendor Balance is unchanged.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="number" min="0.01" step="0.01" value={accountabilityCollectionAmount} onChange={(event) => setAccountabilityCollectionAmount(event.target.value)} placeholder="Amount" className="rounded-2xl border border-slate-200 px-3 py-2" />
                  <select value={accountabilityCollectionOption} onChange={(event) => setAccountabilityCollectionOption(event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2"><option value="">Payment method</option>{(accountabilityPaymentOptionsQuery.data ?? []).map((option) => <option key={option.payment_option_id} value={option.payment_option_id}>{option.name}</option>)}</select>
                </div>
                <input value={accountabilityCollectionReason} onChange={(event) => setAccountabilityCollectionReason(event.target.value)} placeholder="Reason (optional)" className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2" />
                <Button type="button" className="mt-3" onClick={handleAccountabilityCollection} disabled={collectionMutation.isPending || !accountabilityCollectionAmount || !accountabilityCollectionOption}>{collectionMutation.isPending ? 'Recording…' : 'Record collection'}</Button>
                {collectionMutation.error ? <p className="mt-2 text-sm text-rose-600">{collectionMutation.error.message}</p> : null}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Return stock</p>
                <p className="mt-1 text-xs text-slate-500">Reduces Agent Accountability only. Vendor Balance is unchanged.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><select value={accountabilityReturnProduct} onChange={(event) => setAccountabilityReturnProduct(event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2"><option value="">Product</option>{delivery.items.filter((item) => item.product_id).map((item) => <option key={item.product_id} value={item.product_id}>{item.product_name}</option>)}</select><input type="number" min="0.001" step="0.001" value={accountabilityReturnQuantity} onChange={(event) => setAccountabilityReturnQuantity(event.target.value)} placeholder="Quantity" className="rounded-2xl border border-slate-200 px-3 py-2" /></div>
                <input value={accountabilityReturnReason} onChange={(event) => setAccountabilityReturnReason(event.target.value)} placeholder="Reason (optional)" className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2" />
                <Button type="button" className="mt-3" onClick={handleAccountabilityReturn} disabled={returnMutation.isPending || !accountabilityReturnProduct || !accountabilityReturnQuantity}>{returnMutation.isPending ? 'Recording…' : 'Return stock'}</Button>
                {returnMutation.error ? <p className="mt-2 text-sm text-rose-600">{returnMutation.error.message}</p> : null}
              </div>
            </div>
          ) : null}
          {accountabilityQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading accountability history…</p> : null}
          {accountabilityQuery.isError ? <p className="mt-4 text-sm text-rose-600">Unable to load accountability history.</p> : null}
          {accountabilityQuery.data?.events.length ? (
            <div className="mt-4 space-y-2">
              {accountabilityQuery.data.events.map((event) => (
                <div key={event.event_id} className="rounded-2xl bg-white px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-slate-900">{event.event_type === 'pending_delivery' ? 'Pending delivery' : 'Delivery activated'}</span><span className="text-slate-600">D{event.amount_delta.toLocaleString()}</span></div>
                  <p className="mt-1 text-xs text-slate-500">{new Date(event.occurred_at).toLocaleString()} · Recorded by {event.recorded_by_name || 'Unknown user'}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <DeliveryLocationReporter
        deliveryId={delivery.delivery_id}
        active={isDeliveryUser && delivery.status === 'ongoing' && delivery.claimed_by === currentUserId}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Payments received</h2>
            <p className="mt-1 text-sm text-slate-600">Total received: <span className="font-semibold">{Number(paymentsQuery.data?.total_amount ?? 0).toLocaleString()}</span></p>
          </div>
        </div>
        {canRecordPayment ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-sidrah-100 bg-sidrah-50/40 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-semibold text-slate-900">Amount received<input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 font-normal" /></label>
            <label className="text-sm font-semibold text-slate-900">Payment method<select value={paymentOptionId} onChange={(event) => setPaymentOptionId(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 font-normal"><option value="">Select method</option>{(paymentOptionsQuery.data ?? []).map((option) => <option key={option.payment_option_id} value={option.payment_option_id}>{option.name}</option>)}</select></label>
            <Button type="button" onClick={handleRecordPayment} disabled={!paymentAmount || !paymentOptionId || Number(paymentAmount) <= 0 || recordPaymentMutation.isPending}>{recordPaymentMutation.isPending ? 'Recording…' : 'Record payment'}</Button>
            {recordPaymentMutation.error ? <p className="text-sm text-rose-600 sm:col-span-3">{recordPaymentMutation.error.message}</p> : null}
          </div>
        ) : null}
        {paymentsQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading payment history…</p> : null}
        {paymentsQuery.isError ? <p className="mt-4 text-sm text-rose-600">Unable to load payment history.</p> : null}
        {!paymentsQuery.isLoading && !paymentsQuery.isError && (paymentsQuery.data?.payments.length ?? 0) === 0 ? <p className="mt-4 text-sm text-slate-500">No payments recorded.</p> : null}
        <div className="mt-4 space-y-3">{(paymentsQuery.data?.payments ?? []).map((payment) => <div key={payment.payment_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-slate-900">{Number(payment.amount).toLocaleString()} · {payment.payment_method}</span><span className="text-xs text-slate-500">{new Date(payment.recorded_at).toLocaleString()}</span></div><p className="mt-1 text-slate-600">Recorded by {payment.recorded_by_name || 'Unknown user'}</p></div>)}</div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Activity</h2>
          {canAddComment ? <Button type="button" variant="secondary" onClick={() => setShowCommentForm((value) => !value)}>+ Add comment</Button> : null}
        </div>
        {showCommentForm && canAddComment ? (
          <div className="mt-4 rounded-2xl border border-sidrah-100 bg-sidrah-50/40 p-4">
            <label htmlFor="standalone-delivery-comment" className="text-sm font-semibold text-slate-900">Add comment</label>
            <textarea id="standalone-delivery-comment" value={standaloneComment} onChange={(event) => setStandaloneComment(event.target.value)} maxLength={2000} rows={4} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sidrah-500" placeholder="Add operational context" />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{standaloneComment.length} / 2000</span>{addCommentMutation.error ? <span className="text-rose-600">{addCommentMutation.error.message}</span> : null}</div>
            <div className="mt-3 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => { setShowCommentForm(false); setStandaloneComment(''); addCommentMutation.reset(); }}>Cancel</Button><Button type="button" onClick={() => addCommentMutation.mutate({ deliveryId: delivery.delivery_id, comment: standaloneComment }, { onSuccess: () => { setStandaloneComment(''); setShowCommentForm(false); } })} disabled={!standaloneComment.trim() || addCommentMutation.isPending}>{addCommentMutation.isPending ? 'Adding…' : 'Add comment'}</Button></div>
          </div>
        ) : null}
        {activitiesLoading ? <p className="mt-4 text-sm text-slate-500">Loading activity…</p> : null}
        {!activitiesLoading && activities.length === 0 ? <p className="mt-4 text-sm text-slate-500">No activity recorded yet.</p> : null}
        <div className="mt-4 space-y-4">
          {activities.map((activity) => {
            const labels: Record<string, string> = { created: 'Created', claimed: 'Claimed', assigned: 'Assigned', reassigned: 'Reassigned', delivered: 'Delivered', cancelled: 'Cancelled', comment: 'Comment' };
            return (
              <div key={activity.activity_id} className="border-l-2 border-sidrah-200 pl-4">
                <p className="font-semibold text-slate-900">{labels[activity.activity_type] ?? 'Activity'}</p>
                <p className="text-xs text-slate-500">{new Date(activity.occurred_at).toLocaleString()} · {activity.actor_name || 'Unknown user'}</p>
                {activity.previous_status || activity.new_status ? <p className="mt-1 text-xs text-slate-600">{activity.previous_status ? statusLabels[activity.previous_status] : 'Created'}{activity.new_status ? ` → ${statusLabels[activity.new_status]}` : ''}</p> : null}
                {activity.related_user_name ? <p className="mt-1 text-sm text-slate-700">Assigned to {activity.related_user_name}</p> : null}
                {activity.comment ? <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{activity.comment}</p> : null}
              </div>
            );
          })}
        </div>
      </div>

      {canAddItems ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Products</h2>
            <Button type="button" variant="secondary" onClick={() => setShowItemsForm((value) => !value)}>+ Add products</Button>
          </div>
          {showItemsForm ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-sidrah-100 bg-sidrah-50/40 p-4">
              {additionalItems.map((item, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
                  <select value={item.product_id} onChange={(event) => handleAdditionalItemChange(index, 'product_id', event.target.value)} disabled={productsLoading} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="">Select product</option>
                    {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}
                  </select>
                  <input type="number" min={1} value={item.quantity} onChange={(event) => handleAdditionalItemChange(index, 'quantity', event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" aria-label={`Quantity ${index + 1}`} />
                  <Button type="button" variant="secondary" onClick={() => setAdditionalItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={additionalItems.length === 1}>Remove</Button>
                </div>
              ))}
              {productsError ? <p className="text-sm text-rose-600">Unable to load products.</p> : null}
              {addItemsMutation.error ? <p className="text-sm text-rose-600">{addItemsMutation.error.message}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setAdditionalItems((current) => [...current, { product_id: '', quantity: 1 }])}>Add another product</Button>
                <Button type="button" onClick={handleAddItems} disabled={productsLoading || additionalItems.some((item) => !item.product_id || !Number.isFinite(item.quantity) || item.quantity <= 0) || addItemsMutation.isPending}>{addItemsMutation.isPending ? 'Adding…' : 'Add products'}</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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

      {isActionable && (canClaim || canMarkDelivered || canReassign || canCancel) ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <label htmlFor="delivery-action-comment" className="text-sm font-semibold text-slate-900">Activity comment <span className="font-normal text-slate-500">(optional)</span></label>
          <textarea id="delivery-action-comment" value={actionComment} onChange={(event) => setActionComment(event.target.value)} maxLength={2000} rows={3} className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sidrah-500" placeholder="Add context for this action" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {canClaim ? (
          <Button type="button" onClick={() => claimMutation.mutate({ deliveryId: delivery.delivery_id, comment: actionComment })} disabled={claimMutation.isPending}>
            {claimMutation.isPending ? 'Claiming…' : 'Claim Delivery'}
          </Button>
        ) : null}
        {canMarkDelivered ? (
          <Button type="button" onClick={() => deliverMutation.mutate({ deliveryId: delivery.delivery_id, comment: actionComment })} disabled={deliverMutation.isPending}>
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
