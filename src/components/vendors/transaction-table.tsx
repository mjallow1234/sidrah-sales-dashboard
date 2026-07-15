import type { Transaction } from '@/lib/types';

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="grid grid-cols-4 gap-4 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500 sm:grid-cols-6">
        <div>Date</div>
        <div>Sold</div>
        <div>Added</div>
        <div>Cash</div>
        <div className="hidden sm:block">Closing</div>
        <div className="hidden sm:block">Sales Rep</div>
      </div>
      <div className="divide-y divide-slate-200">
        {transactions.map((transaction) => (
          <div key={transaction.transaction_id} className="grid grid-cols-4 gap-4 px-4 py-4 text-sm text-slate-700 sm:grid-cols-6">
            <div>{transaction.date}</div>
            <div>{transaction.stock_sold}</div>
            <div>{transaction.stock_added}</div>
            <div>{transaction.cash_collected.toLocaleString()}</div>
            <div className="hidden sm:block">{transaction.closing_stock}</div>
            <div className="hidden sm:block">{transaction.sales_rep}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
