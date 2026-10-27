import { PaymentSheetError, useStripe } from '@stripe/stripe-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useCallback } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { orderService } from '@/services/order.service';
import type { PayResult } from '@/types/payment';
import { useMe } from './queries';

/**
 * Asks the backend to check the payment with Stripe and mark the order paid if it
 * went through. Doesn't depend on the webhook, so a missed webhook can't leave a
 * paid order stuck on "waiting for payment".
 */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: orderService.confirmPayment,
    onSettled: (_result, _error, orderId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.order(orderId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}

/**
 * Returns `pay(orderId)`: gets a PaymentIntent from the backend, shows Stripe's
 * PaymentSheet, then confirms with the backend straight away.
 */
export function usePayOrder() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();
  const confirm = useConfirmPayment();
  const { data: me } = useMe();

  return useCallback(
    async (orderId: string): Promise<PayResult> => {
      const params = await orderService.preparePayment(orderId);

      const init = await initPaymentSheet({
        merchantDisplayName: 'Brew',
        paymentIntentClientSecret: params.clientSecret,
        returnURL: Linking.createURL('stripe-redirect'),
        defaultBillingDetails: me ? { name: me.fullName, email: me.email } : undefined,
      });
      if (init.error) throw new Error(init.error.message);

      const result = await presentPaymentSheet();
      if (result.error) {
        // The sheet may have recorded a failed attempt (e.g. a declined card).
        void queryClient.invalidateQueries({
          queryKey: queryKeys.order(orderId),
        });
        if (result.error.code === PaymentSheetError.Canceled) return { outcome: 'cancelled' };
        throw new Error(result.error.message);
      }

      // Stripe has the money now. Even if confirming fails (e.g. the network
      // dropped), this is a paid order: never let the customer pay again. The
      // order screen and the backend's reconcile job confirm it later.
      try {
        const confirmed = await confirm.mutateAsync(orderId);
        return { outcome: 'paid', orderStatus: confirmed.orderStatus };
      } catch {
        return { outcome: 'paid', orderStatus: 'pending_payment' };
      }
    },
    [initPaymentSheet, presentPaymentSheet, queryClient, confirm, me],
  );
}
