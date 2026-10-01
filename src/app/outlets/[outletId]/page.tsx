import { OutletDetail } from '@/components/outlets/outlet-detail';
export default async function OutletPage({ params }: { params: Promise<{ outletId: string }> }) { return <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><OutletDetail outletId={(await params).outletId} /></div></main>; }
