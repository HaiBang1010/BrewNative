import { StripeProvider } from '@stripe/stripe-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { queryClient, useRefetchOnAppFocus } from '@/lib/query-client';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_URL_SCHEME } from '@/lib/stripe';
import { AuthProvider } from './auth-provider';
import { PushProvider } from './push-provider';
import { SocketProvider } from './socket-provider';

/**
 * Every app-wide provider, in the order they depend on each other
 * (AuthProvider uses the query cache, so it sits inside QueryClientProvider;
 * SocketProvider and PushProvider need the signed-in state, so they sit inside AuthProvider).
 * New providers are added here, not in the root layout.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  useRefetchOnAppFocus();

  return (
    // KeyboardProvider tracks the keyboard natively for react-native-keyboard-controller.
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        {/* Publishable key (pk_...) is public; the secret key stays on the backend. */}
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme={STRIPE_URL_SCHEME}>
          <AuthProvider>
            {/* Both need the signed-in state, so they sit inside AuthProvider. */}
            <SocketProvider>
              <PushProvider>{children}</PushProvider>
            </SocketProvider>
          </AuthProvider>
        </StripeProvider>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
