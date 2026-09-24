'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDeliveryPaymentOption, getDeliveryPaymentOptions, getDeliveryPayments, getDeliveryPaymentSummary, recordDeliveryPayment, updateDeliveryPaymentOption } from '@/lib/api/deliveryPayments';
import type { DeliveryRecord } from '@/lib/types';

export function useDeliveryPaymentOptionsQuery(includeInactive = false, enabled = true) {
  return useQuery({ queryKey: ['deliveryPaymentOptions', includeInactive], queryFn: () => getDeliveryPaymentOptions(includeInactive), enabled, staleTime: 60 * 1000 });
}

export function useCreateDeliveryPaymentOptionMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: createDeliveryPaymentOption, onSuccess: () => { client.invalidateQueries({ queryKey: ['deliveryPaymentOptions'] }); } });
}

export function useUpdateDeliveryPaymentOptionMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: { name?: string; is_active?: boolean } }) => updateDeliveryPaymentOption(id, payload), onSuccess: () => { client.invalidateQueries({ queryKey: ['deliveryPaymentOptions'] }); } });
}

export function useDeliveryPaymentsQuery(deliveryId?: string, enabled = true) {
  return useQuery({ queryKey: ['deliveryPayments', deliveryId], queryFn: () => getDeliveryPayments(deliveryId ?? ''), enabled: Boolean(deliveryId) && enabled });
}

export function useDeliveryPaymentsSummaryQuery(deliveries: DeliveryRecord[], enabled = true) {
  const results = useQueries({
    queries: deliveries.map((delivery) => ({
      queryKey: ['deliveryPayments', delivery.delivery_id],
      queryFn: () => getDeliveryPayments(delivery.delivery_id),
      enabled,
    })),
  });
  const payments = results.flatMap((result, index) => (result.data?.payments ?? []).map((payment) => ({
    ...payment,
    delivery: deliveries[index],
  })));
  return {
    payments,
    total_amount: payments.reduce((total, payment) => total + payment.amount, 0),
    isLoading: enabled && results.some((result) => result.isLoading),
    isError: enabled && results.some((result) => result.isError),
  };
}

export function useDeliveryPaymentSummaryQuery(filters: { date: string; location?: string; vendor?: string }, enabled = true) {
  return useQuery({
    queryKey: ['deliveryPaymentSummary', filters],
    queryFn: () => getDeliveryPaymentSummary(filters),
    enabled,
  });
}

export function useRecordDeliveryPaymentMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ deliveryId, amount, paymentOptionId }: { deliveryId: string; amount: number; paymentOptionId: string }) => recordDeliveryPayment(deliveryId, amount, paymentOptionId), onSuccess: (_data, variables) => { client.invalidateQueries({ queryKey: ['deliveryPayments', variables.deliveryId] }); } });
}
