import type { Vendor } from '@/lib/types';

interface VendorCardProps {
  vendor: Vendor;
}

export function VendorCard({ vendor }: VendorCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{vendor.vendor_id}</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{vendor.vendor_name}</h3>
          <p className="mt-1 text-sm text-slate-600">{vendor.location}</p>
        </div>
        <span className="rounded-full bg-sidrah-50 px-3 py-1 text-xs font-semibold text-sidrah-700">
          {vendor.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-700">Sales rep: {vendor.sales_rep}</p>
    </div>
  );
}
