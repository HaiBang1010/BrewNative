import { router } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { notificationsService } from '@/services/notifications';
import { userService } from '@/services/user.service';
import type { NotificationData } from '@/types/notifications';
import { notificationRoute } from '@/utils/notification-route';
import { useAuth } from './auth-provider';

type PushContextValue = {
  /**
   * Asks for permission (system prompt the first time) and registers this device.
   * Customers are asked at a moment where it makes sense: right after paying.
   */
  enable: () => Promise<boolean>;
};

const PushContext = createContext<PushContextValue | null>(null);

/**
 * Push notifications while signed in: "đơn đã sẵn sàng" when the app is in the
 * background or closed (WebSocket only works while it's open).
 * - Registers this device's token with the backend, again whenever it changes.
 *   Staff are asked for permission at sign-in (new orders are their job);
 *   customers only once they've paid (see `enable`).
 * - Tapping a notification opens the order or the chat.
 * Signing out unregisters the device (auth-provider passes the token to /auth/logout).
 */
export function PushProvider({ children }: { children: ReactNode }) {
  const { isLoading, isSignedIn, isStaff } = useAuth();

  const register = useCallback(async () => {
    const token = await notificationsService.getPushToken();
    if (!token) return;
    // Offline: retried at the next sign-in or app start.
    await userService
      .registerPushToken(token, notificationsService.platform)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    void (async () => {
      const allowed = isStaff
        ? await notificationsService.requestPermission()
        : await notificationsService.hasPermission();
      if (allowed && !cancelled) await register();
    })();
    const unsubscribe = notificationsService.onTokenChange(() => void register());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isSignedIn, isStaff, register]);

  // Wait for the sign-in state: it decides which screens exist (customer or shop).
  useEffect(() => {
    if (isLoading || !isSignedIn) return;
    const open = (data: NotificationData) => {
      const href = notificationRoute(data, isStaff);
      if (href) router.push(href);
    };
    // The notification that launched the app, then taps while it runs.
    const launchTap = notificationsService.takeLaunchTap();
    if (launchTap) open(launchTap);
    return notificationsService.onTap(open);
  }, [isLoading, isSignedIn, isStaff]);

  const enable = useCallback(async () => {
    const allowed = await notificationsService.requestPermission();
    if (allowed) await register();
    return allowed;
  }, [register]);

  const value = useMemo(() => ({ enable }), [enable]);
  return <PushContext value={value}>{children}</PushContext>;
}

export function usePush(): PushContextValue {
  const value = use(PushContext);
  if (!value) throw new Error('usePush must be used inside <PushProvider>');
  return value;
}
