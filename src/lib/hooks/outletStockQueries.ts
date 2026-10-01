'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOutletStockReceipt, getOutletStock } from '@/lib/api/outletStock';
export const useOutletStockQuery = (outletId?: string) => useQuery({ queryKey: ['outletStock', outletId], queryFn: () => getOutletStock(outletId as string), enabled: !!outletId });
export function useCreateOutletStockReceiptMutation() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ outletId, payload }: { outletId: string; payload: Record<string, unknown> }) => createOutletStockReceipt(outletId, payload), onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['outletStock', vars.outletId] }) }); }
