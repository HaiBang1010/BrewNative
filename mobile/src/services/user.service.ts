import type { User } from '@/types/api';
import { api } from './session';

/** /me endpoints: the signed-in user's own account. */
export const userService = {
  getMe: (signal?: AbortSignal) => api.get<User>('/me', { signal }),

  /** Lets the backend send push notifications to this device. Idempotent. */
  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    api.post<void>('/me/push-tokens', { token, platform }),
};
