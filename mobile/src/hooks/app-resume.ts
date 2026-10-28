import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ordersQuery } from '@/hooks/queries';
import { inProgressOrderId, resumeAction } from '@/utils/app-resume';

/** Don't keep the splash up longer than this waiting for the network. */
const RESTART_MAX_WAIT_MS = 5_000;

type Splash = {
  /** 0 = cold start, then 1, 2... for each restart after a long absence (remounts the splash). */
  run: number;
  /** Restart only: home screen chosen and data refetched. */
  restartDone: boolean;
};

/**
 * The splash over the app, on a cold start and again when the app comes back
 * after a long time in the background (utils/app-resume.ts has the durations):
 * - away a while: refetch every query, stay on the same screen;
 * - away long: the splash plays again while the app goes back to its home screen
 *   (a customer with an order in progress lands on that order) and refetches everything.
 *   Like a restart for the user, but nothing is reloaded: the cart and sign-in stay.
 */
export function useAppSplash({
  isLoading,
  isSignedIn,
  isStaff,
}: {
  isLoading: boolean;
  isSignedIn: boolean;
  isStaff: boolean;
}) {
  const queryClient = useQueryClient();
  const [splash, setSplash] = useState<Splash | null>({ run: 0, restartDone: false });
  const backgroundSince = useRef<number | null>(null);

  async function goHome() {
    if (!isSignedIn) return; // the sign-in screens are the only screens anyway
    if (isStaff) return router.dismissTo('/admin/orders');
    router.dismissTo('/');
    const orders = await queryClient.fetchQuery({ ...ordersQuery, staleTime: 0 });
    const orderId = inProgressOrderId(orders.items);
    if (orderId) router.push({ pathname: '/orders/[id]', params: { id: orderId } });
  }

  // An effect event: the AppState listener stays subscribed, but sees the current sign-in state.
  const onResume = useEffectEvent(async (awayMs: number) => {
    const action = resumeAction(awayMs);
    if (action === 'refresh') void queryClient.invalidateQueries();
    if (action !== 'restart') return;

    setSplash((current) => ({ run: (current?.run ?? 0) + 1, restartDone: false }));
    // Change screens only once the splash covers them.
    await nextFrame();
    try {
      // Offline: give up waiting after a few seconds, the screens show their own errors.
      await withTimeout(
        goHome().then(() => queryClient.invalidateQueries()),
        RESTART_MAX_WAIT_MS,
      );
    } catch {
      // e.g. the orders request failed: stay on the home screen.
    } finally {
      setSplash((current) => current && { ...current, restartDone: true });
    }
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundSince.current = Date.now();
      } else if (state === 'active' && backgroundSince.current !== null) {
        const awayMs = Date.now() - backgroundSince.current;
        backgroundSince.current = null;
        void onResume(awayMs);
      }
    });
    return () => subscription.remove();
  }, []);

  const hideSplash = useCallback(() => setSplash(null), []);

  return {
    splash: splash && {
      key: splash.run,
      coldStart: splash.run === 0,
      ready: splash.run === 0 ? !isLoading : splash.restartDone,
    },
    hideSplash,
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(resolve, ms))]);
}
