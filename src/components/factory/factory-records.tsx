'use client';

import { useState } from 'react';
import { FactoryContainerSection } from './factory-container-section';
import { FactoryHistory } from './factory-history';

type Tab = 'all' | 'production' | 'movements' | 'containers';

export function FactoryRecords() {
  const [tab, setTab] = useState<Tab>('all');
  const tabs: Array<[Tab, string]> = [['all', 'All'], ['production', 'Production'], ['movements', 'Product Movements'], ['containers', 'Containers']];
  return <div className="space-y-5">
    <nav aria-label="Factory record types" className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 sm:grid-cols-4">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${tab === value ? 'bg-white text-sidrah-700 shadow-sm' : 'text-slate-600'}`}>{label}</button>)}</nav>
    {tab === 'all' ? <div className="space-y-6"><p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">All Factory records are grouped below by operation type. Open any record to view its status, correction history, and inventory impact.</p><FactoryHistory mode="production" /><FactoryHistory mode="movements" /><FactoryContainerSection historyOnly /></div> : null}
    {tab === 'production' ? <FactoryHistory mode="production" /> : null}
    {tab === 'movements' ? <FactoryHistory mode="movements" /> : null}
    {tab === 'containers' ? <FactoryContainerSection historyOnly /> : null}
  </div>;
}
