import { create } from 'zustand';
import type { Vendor } from '@/lib/types';

interface VisitDraft {
  vendor_id: string;
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
        stock_sold: 0,
        cash_collected: 0,
        stock_added: 0,
        notes: '',
      },
    }),
  setErrorMessage: (message) => set({ errorMessage: message }),
}));
