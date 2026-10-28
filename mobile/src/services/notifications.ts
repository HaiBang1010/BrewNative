import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationData } from '@/types/notifications';

/**
 * The device side of push notifications (expo-notifications): permission, the
 * Expo push token, and taps. Sending is the backend's job (backend/src/push).
 * Native module: needs a development build made after installing it.
 */

/** Same id as `defaultChannel` of the expo-notifications plugin in app.json. */
const ANDROID_CHANNEL_ID = 'default';

/** EAS project id (written to app.json by `eas init`); Expo push tokens are issued per project. */
const projectId: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

/** The last token obtained, so signing out can unregister this device. */
let currentToken: string | null = null;
let pendingToken: Promise<string | null> | null = null;

// While the app is open, still show the banner: "Đơn đã sẵn sàng" is worth seeing
// even on another screen. Must be set before any notification arrives.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function isGranted(permission: Notifications.NotificationPermissionsStatus): boolean {
  return (
    permission.granted ||
    permission.ios?.status === IosAuthorizationStatus.PROVISIONAL
  );
}

function toData(response: Notifications.NotificationResponse | null): NotificationData | null {
  const data = response?.notification.request.content.data;
  return data && typeof data.type === 'string' ? (data as NotificationData) : null;
}

export const notificationsService = {
  platform: Platform.OS === 'ios' ? ('ios' as const) : ('android' as const),

  /** Whether the user already allowed notifications (doesn't ask). */
  hasPermission: async () => isGranted(await Notifications.getPermissionsAsync()),

  /**
   * Shows the system prompt the first time; afterwards returns the saved answer
   * (iOS never asks twice: the user must change it in Settings).
   */
  async requestPermission(): Promise<boolean> {
    // Android 13+ only shows the prompt once a channel exists.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Đơn hàng và tin nhắn',
        importance: AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (isGranted(current)) return true;
    if (!current.canAskAgain) return false;
    return isGranted(await Notifications.requestPermissionsAsync());
  },

  /**
   * This device's Expo push token, or null when push can't work here: no EAS
   * project id yet, or no network / no push service (some emulators).
   */
  getPushToken(): Promise<string | null> {
    if (!projectId) {
      if (__DEV__) console.warn('Push: no EAS projectId in app.json, run `eas init` in mobile/.');
      return Promise.resolve(null);
    }
    // Callers at the same moment (sign-in, a burst of token-change events) share one request.
    pendingToken ??= Notifications.getExpoPushTokenAsync({ projectId })
      .then(({ data }) => (currentToken = data))
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Push: could not get a push token', error);
        return null;
      })
      .finally(() => {
        pendingToken = null;
      });
    return pendingToken;
  },

  currentToken: () => currentToken,

  /** The OS may replace the token while the app runs; the old one stops working. */
  onTokenChange(listener: () => void) {
    const subscription = Notifications.addPushTokenListener(listener);
    return () => subscription.remove();
  },

  /** The notification the user tapped to open the app, if any. Read once. */
  takeLaunchTap(): NotificationData | null {
    const data = toData(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();
    return data;
  },

  /** Taps while the app is running (in the background or open). */
  onTap(listener: (data: NotificationData) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = toData(response);
      if (data) listener(data);
    });
    return () => subscription.remove();
  },
};
