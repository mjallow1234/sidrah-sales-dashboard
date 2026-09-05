import type { Transaction } from '@/lib/types';

interface TransactionTableProps {
  transactions: Transaction[];
  salesRepNames?: Record<string, string>;
  actorNames?: Record<string, string>;
}

function resolveActorLabel(
  rawActorId: string | undefined,
  salesRepNames?: Record<string, string>,
  actorNames?: Record<string, string>
) {
  if (!rawActorId) {
    return 'Unknown actor';
  }

  if (salesRepNames?.[rawActorId]) {
    return salesRepNames[rawActorId];
  }

  if (actorNames?.[rawActorId]) {
    return actorNames[rawActorId];
  }

  return rawActorId;
}

export function TransactionTable({ transactions, salesRepNames, actorNames }: TransactionTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="grid grid-cols-3 gap-4 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500 sm:grid-cols-5">
        <div>Date</div>
        <div>Supplied</div>
        <div>Cash</div>
        <div className="hidden sm:block">Closing</div>
        <div className="hidden sm:block">Actor</div>
      </div>
      <div className="divide-y divide-slate-200">
        {transactions.map((transaction, index) => (
          <div
            key={`${transaction.transaction_id || 'transaction'}-${transaction.vendor_id}-${transaction.date}-${index}`}
            className="grid grid-cols-3 gap-4 px-4 py-4 text-sm text-slate-700 sm:grid-cols-5"
          >
            <div>{transaction.date}</div>
            <div>{transaction.stock_added}</div>
            <div>{transaction.cash_collected.toLocaleString()}</div>
            <div className="hidden sm:block">{transaction.closing_stock}</div>
            <div className="hidden sm:block">
              {resolveActorLabel(transaction.actor, salesRepNames, actorNames)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
