import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { ApiError } from '@/utils/api-error';
import { isOnline } from '@/utils/network';

/**
 * TanStack Query only knows the browser's online events; on a phone, NetInfo tells it.
 * While offline, queries pause (no error screen) and mutations wait; back online,
 * stale queries refetch and waiting mutations run.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(isOnline(state))),
);

/** Whether the device has internet right now (for the offline banner, the pay button...). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () => onlineManager.isOnline());
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data counts as fresh for 30 s: switching tabs doesn't refetch every time.
      staleTime: 30_000,
      // Retry network/server errors, not "not found" or "forbidden".
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
});

/**
 * On the web, TanStack Query refetches stale data when the browser tab regains focus.
 * Phones have no browser tab: treat "app came back to the foreground" as focus.
 */
export function useRefetchOnAppFocus(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);
}
