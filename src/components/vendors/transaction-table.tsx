import { useEffect, useState } from 'react';
import type { Transaction } from '@/lib/types';
import { useReverseVisitMutation } from '@/lib/hooks/queries';

interface TransactionTableProps {
  transactions: Transaction[];
  salesRepNames?: Record<string, string>;
  actorNames?: Record<string, string>;
  enableAgentReversal?: boolean;
  currentSalesRepId?: string;
  canAdministrativeReversal?: boolean;
  onReversed?: () => void;
}

function resolveActorLabel(rawActorId: string | undefined, salesRepNames?: Record<string, string>, actorNames?: Record<string, string>) {
  if (!rawActorId) return 'Unknown actor';
  return salesRepNames?.[rawActorId] || actorNames?.[rawActorId] || rawActorId;
}

function formatRecordedAt(value?: string) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{value || '-'}</dd>
    </div>
  );
}

export function TransactionTable({ transactions, salesRepNames, actorNames, enableAgentReversal = false, currentSalesRepId, canAdministrativeReversal = false, onReversed }: TransactionTableProps) {
  const reverseMutation = useReverseVisitMutation();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [reason, setReason] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function canAgentReverse(transaction: Transaction) {
    if (!enableAgentReversal || !currentSalesRepId || transaction.is_reversed || !transaction.visit_id || !transaction.timestamp) return false;
    if (transaction.sales_rep_id !== currentSalesRepId) return false;
    const recordedAt = new Date(transaction.timestamp).getTime();
    return Number.isFinite(recordedAt) && now <= recordedAt + 24 * 60 * 60 * 1000;
  }

  function canReverse(transaction: Transaction) {
    if (transaction.is_reversed || !transaction.visit_id) return false;
    return canAdministrativeReversal || canAgentReverse(transaction);
  }

  function submitReversal(transaction: Transaction) {
    if (!transaction.visit_id || !reason.trim()) return;
    reverseMutation.mutate({ visit_id: transaction.visit_id, reason: reason.trim() }, {
      onSuccess: () => {
        setReason('');
        setSelectedTransaction(null);
        onReversed?.();
      },
    });
  }

  return (
    <>
      <div className="space-y-3">
        {transactions.map((transaction, index) => {
          const actor = resolveActorLabel(transaction.actor || transaction.sales_rep_id, salesRepNames, actorNames);
          const reversed = Boolean(transaction.is_reversed);
          return (
            <article key={`${transaction.transaction_id || 'transaction'}-${transaction.vendor_id}-${transaction.date}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sidrah-300 hover:shadow-soft">
              <button type="button" className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sidrah-500" onClick={() => { setSelectedTransaction(transaction); setReason(''); }} aria-label={`View transaction ${transaction.transaction_id || transaction.date}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{transaction.product_name ? `${transaction.product_name} (${transaction.product_id})` : (transaction.product_id || 'Visit transaction')}</p>
                    <p className="mt-1 text-sm text-slate-600">Vendor: {transaction.vendor_name ? `${transaction.vendor_name} (${transaction.vendor_id})` : (transaction.vendor_id || '-')}</p>
                  </div>
                  <span className="shrink-0 text-xl text-slate-400" aria-hidden="true">›</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Date</p><p className="mt-1 font-medium text-slate-800">{transaction.date}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Supplied</p><p className="mt-1 font-medium text-slate-800">{transaction.stock_added}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Cash</p><p className="mt-1 font-medium text-slate-800">{transaction.cash_collected.toLocaleString()}</p></div>
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Actor</p><p className="mt-1 truncate font-medium text-slate-800">{actor}</p></div>
                </div>
                <div className="mt-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${reversed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{reversed ? 'Reversed' : 'Active'}</span></div>
              </button>
            </article>
          );
        })}
      </div>

      {selectedTransaction ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm uppercase tracking-[0.2em] text-sidrah-500">Visit detail</p><h2 id="transaction-detail-title" className="mt-1 text-xl font-semibold text-slate-900">Transaction information</h2></div>
              <button type="button" onClick={() => setSelectedTransaction(null)} className="rounded-full px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Close</button>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <Detail label="Status" value={selectedTransaction.is_reversed ? 'Reversed' : 'Active'} />
              <Detail label="Visit ID" value={selectedTransaction.visit_id || selectedTransaction.transaction_id} />
              <Detail label="Date" value={selectedTransaction.date} />
              <Detail label="Recorded timestamp" value={formatRecordedAt(selectedTransaction.timestamp)} />
              <Detail label="Vendor" value={selectedTransaction.vendor_name ? `${selectedTransaction.vendor_name} (${selectedTransaction.vendor_id})` : selectedTransaction.vendor_id} />
              <Detail label="Sales representative" value={resolveActorLabel(selectedTransaction.sales_rep_id, salesRepNames, actorNames)} />
              <Detail label="Actor" value={resolveActorLabel(selectedTransaction.actor || selectedTransaction.sales_rep_id, salesRepNames, actorNames)} />
              <Detail label="Product" value={selectedTransaction.product_name ? `${selectedTransaction.product_name} (${selectedTransaction.product_id})` : (selectedTransaction.product_id || '-')} />
              <Detail label="Quantity supplied" value={String(selectedTransaction.stock_added)} />
              <Detail label="Cash collected" value={selectedTransaction.cash_collected.toLocaleString()} />
              <Detail label="Closing stock" value={String(selectedTransaction.closing_stock)} />
              <Detail label="Notes" value={selectedTransaction.notes || '-'} />
              {selectedTransaction.is_reversed ? <><Detail label="Reversed by" value={selectedTransaction.reversed_by || '-'} /><Detail label="Reversal timestamp" value={formatRecordedAt(selectedTransaction.reversed_at)} /><Detail label="Reversal reason" value={selectedTransaction.reversal_reason || '-'} /><Detail label="Reversal operation ID" value={selectedTransaction.reversal_operation_id || '-'} /></> : null}
            </dl>

            {canReverse(selectedTransaction) ? (
              <div className="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Reverse visit</p>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Reversal reason" className="w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded-full bg-sidrah-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={reverseMutation.isPending || !reason.trim()} onClick={() => submitReversal(selectedTransaction)}>{reverseMutation.isPending ? 'Reversing...' : 'Confirm reversal'}</button>
                  <button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setReason('')}>Clear reason</button>
                </div>
                {reverseMutation.isError ? <p className="text-sm text-rose-700">{reverseMutation.error.message}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
