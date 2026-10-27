import { OutletDetail } from '@/components/outlets/outlet-detail';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';
import { OutletSalesRepAccess } from '@/components/outlets/outlet-sales-rep-access';
export default async function OutletPage({ params }: { params: Promise<{ outletId: string }> }) { if (!(await getPagePermission('outlets.view'))) notFound(); const outletId = (await params).outletId; return <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><OutletDetail outletId={outletId} /><OutletSalesRepAccess outletId={outletId} /></div></main>; }
