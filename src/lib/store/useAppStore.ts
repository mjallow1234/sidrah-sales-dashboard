import { create } from 'zustand';
import type { Vendor } from '@/lib/types';

interface VisitDraft {
  vendor_id: string;
  product_id: string;
  sales_rep_id: string;
  unit_price: number;
  payment_method: string;
  payment_reference: string;
  stock_sold: number;
  cash_collected: number;
  stock_added: number;
  notes: string;
}

interface AppState {
  searchQuery: string;
  selectedVendorId: string;
  visitDraft: VisitDraft;
  errorMessage: string | null;
  setSearchQuery: (query: string) => void;
  setSelectedVendorId: (vendorId: string) => void;
  setVisitDraft: (draft: Partial<VisitDraft>) => void;
  resetVisitDraft: (vendorId: string) => void;
  setErrorMessage: (message: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  searchQuery: '',
  selectedVendorId: '',
  visitDraft: {
    vendor_id: '',
    product_id: '',
    sales_rep_id: '',
    unit_price: 0,
    payment_method: 'cash',
    payment_reference: '',
    stock_sold: 0,
    cash_collected: 0,
    stock_added: 0,
    notes: '',
  },
  errorMessage: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedVendorId: (vendorId) => set({ selectedVendorId: vendorId }),
  setVisitDraft: (draft) => set((state) => ({ visitDraft: { ...state.visitDraft, ...draft } })),
  resetVisitDraft: (vendorId) =>
    set({
      visitDraft: {
        vendor_id: vendorId,
        product_id: '',
        sales_rep_id: '',
        unit_price: 0,
        payment_method: 'cash',
        payment_reference: '',
        stock_sold: 0,
        cash_collected: 0,
        stock_added: 0,
        notes: '',
      },
    }),
  setErrorMessage: (message) => set({ errorMessage: message }),
}));
