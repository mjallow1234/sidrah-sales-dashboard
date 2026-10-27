import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';
import { OutletSalesEntry } from '@/components/outlets/outlet-sales-entry';
export default async function OutletSalesPage({ params }: { params: Promise<{ outletId: string }> }) { const session = await getPagePermission('outlets.sales.record'); if (!session) notFound(); return <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-2xl"><OutletSalesEntry outletId={(await params).outletId} /></div></main>; }
