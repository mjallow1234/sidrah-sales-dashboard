import { VendorLocationRequests } from '@/components/vendors/vendor-location-requests';

export default function VendorLocationRequestsPage() {
  return <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl space-y-6"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Vendor locations</p><h1 className="mt-3 text-2xl font-semibold text-slate-900">Location update requests</h1><p className="mt-2 text-sm text-slate-600">Review proposed GPS updates before they replace an existing vendor location.</p></section><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><VendorLocationRequests /></section></div></main>;
}
