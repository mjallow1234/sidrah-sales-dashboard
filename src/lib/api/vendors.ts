import type { Vendor } from '@/lib/types';

const vendors: Vendor[] = [
  {
    vendor_id: 'V_001',
    vendor_name: 'Basiru Secka',
    phone: '7401457',
    location: 'Serekunda',
    sales_rep: 'Sales Team A',
    date_created: '2026-07-01',
    status: 'active',
  },
  {
    vendor_id: 'V_002',
    vendor_name: 'Fatou Jawara',
    phone: '7643210',
    location: 'Banjul',
    sales_rep: 'Sales Team B',
    date_created: '2026-06-28',
    status: 'active',
  },
  {
    vendor_id: 'V_003',
    vendor_name: 'Musa Sanyang',
    phone: '7209876',
    location: 'Bakau',
    sales_rep: 'Sales Team A',
    date_created: '2026-06-30',
    status: 'inactive',
  },
];

export function getVendors(): Vendor[] {
  return vendors;
}

export function getVendorById(vendorId: string): Vendor | undefined {
  return vendors.find((vendor) => vendor.vendor_id === vendorId);
}
