import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';
import { notFound } from 'next/navigation';
import { AssignedOutletSalesList } from '@/components/outlets/assigned-outlet-sales-list';
export default async function AssignedOutletSalesPage() { if (!(await getPagePermission('outlets.sales.record'))) notFound(); return <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl"><AssignedOutletSalesList /></div></main>; }
