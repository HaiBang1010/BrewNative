import { StripeProvider } from '@stripe/stripe-react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { queryClient, useRefetchOnAppFocus } from '@/lib/query-client';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_URL_SCHEME } from '@/lib/stripe';
import { AuthProvider } from './auth-provider';
import { SocketProvider } from './socket-provider';

/**
 * Every app-wide provider, in the order they depend on each other
 * (AuthProvider uses the query cache, so it sits inside QueryClientProvider;
 * SocketProvider needs the signed-in state, so it sits inside AuthProvider).
 * New providers (WebSocket, notifications...) are added here, not in the root layout.
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
            {/* Needs the signed-in state, so it sits inside AuthProvider. */}
            <SocketProvider>{children}</SocketProvider>
          </AuthProvider>
        </StripeProvider>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
