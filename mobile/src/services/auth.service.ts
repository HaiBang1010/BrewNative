import Constants from 'expo-constants';
import type { AuthResponse } from '@/types/api';
import { api } from './session';

/** Shown in the backend's list of signed-in devices. */
const deviceName = Constants.deviceName ?? undefined;

/** /auth endpoints. These don't send an access token: they are how you get one. */
export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password, deviceName }, { auth: false }),

  register: (fullName: string, email: string, password: string) =>
    api.post<AuthResponse>(
      '/auth/register',
      { fullName, email, password, deviceName },
      { auth: false },
    ),

  loginWithGoogle: (idToken: string) =>
    api.post<AuthResponse>('/auth/google', { idToken, deviceName }, { auth: false }),

  /**
   * Revokes the refresh token on the backend. With `pushToken`, this device also
   * stops receiving that account's push notifications.
   */
  logout: (refreshToken: string, pushToken?: string | null) =>
    api.post<void>(
      '/auth/logout',
      { refreshToken, pushToken: pushToken ?? undefined },
      { auth: false },
    ),
};
