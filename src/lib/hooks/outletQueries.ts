'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOutlet, createOutletSale, getOutlet, getOutletSales, getOutlets, updateOutlet } from '@/lib/api/outlets';
export const useOutletsQuery = () => useQuery({ queryKey: ['outlets'], queryFn: getOutlets });
export const useOutletQuery = (outletId?: string) => useQuery({ queryKey: ['outlet', outletId], queryFn: () => getOutlet(outletId as string), enabled: !!outletId });
export const useOutletSalesQuery = (outletId?: string, filters?: { from?: string; to?: string }) => useQuery({ queryKey: ['outletSales', outletId, filters], queryFn: () => getOutletSales(outletId as string, filters), enabled: !!outletId });
export function useCreateOutletMutation() { const qc = useQueryClient(); return useMutation({ mutationFn: createOutlet, onSuccess: () => qc.invalidateQueries({ queryKey: ['outlets'] }) }); }
export function useUpdateOutletMutation() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ outletId, payload }: { outletId: string; payload: Record<string, unknown> }) => updateOutlet(outletId, payload), onSuccess: (_data, vars) => { qc.invalidateQueries({ queryKey: ['outlets'] }); qc.invalidateQueries({ queryKey: ['outlet', vars.outletId] }); } }); }
export function useCreateOutletSaleMutation() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ outletId, payload }: { outletId: string; payload: Record<string, unknown> }) => createOutletSale(outletId, payload), onSuccess: (_data, vars) => { qc.invalidateQueries({ queryKey: ['outletSales', vars.outletId] }); qc.invalidateQueries({ queryKey: ['outlets'] }); } }); }
