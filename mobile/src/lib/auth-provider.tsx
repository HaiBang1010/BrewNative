import Constants from 'expo-constants';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthResponse } from '@/types/api';
import { getGoogleIdToken, signOutOfGoogle } from './google-sign-in';
import { meQueryKey } from './queries';
import { api, onSessionExpired, tokenStore } from './session';

type AuthState = {
  /** True until the saved tokens have been read from the keychain at startup. */
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  /** Resolves to false if the user closed Google's account picker. */
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Shown in the backend's list of signed-in devices. */
const deviceName = Constants.deviceName ?? undefined;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Startup: signed in if tokens were saved. No network needed, so the app opens
  // offline too; an expired session is detected on the first API call.
  useEffect(() => {
    tokenStore
      .get()
      .then((tokens) => setIsSignedIn(!!tokens))
      .finally(() => setIsLoading(false));
  }, []);

  // The refresh token was rejected (expired, or signed out on another device).
  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.clear();
        setIsSignedIn(false);
      }),
    [queryClient],
  );

  const startSession = useCallback(
    async (response: AuthResponse) => {
      await tokenStore.set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      // The login response already contains the user: no need to fetch /me.
      queryClient.setQueryData(meQueryKey, response.user);
      setIsSignedIn(true);
    },
    [queryClient],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<AuthResponse>(
        '/auth/login',
        { email, password, deviceName },
        { auth: false },
      );
      await startSession(response);
    },
    [startSession],
  );

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      const response = await api.post<AuthResponse>(
        '/auth/register',
        { fullName, email, password, deviceName },
        { auth: false },
      );
      await startSession(response);
    },
    [startSession],
  );

  const signInWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return false;
    const response = await api.post<AuthResponse>(
      '/auth/google',
      { idToken, deviceName },
      { auth: false },
    );
    await startSession(response);
    return true;
  }, [startSession]);

  const signOut = useCallback(async () => {
    const tokens = await tokenStore.get();
    // Tell the backend to revoke the refresh token. If that fails (offline),
    // still sign out locally: the token expires on its own.
    if (tokens) {
      await api
        .post('/auth/logout', { refreshToken: tokens.refreshToken }, { auth: false })
        .catch(() => undefined);
    }
    await tokenStore.set(null);
    await signOutOfGoogle();
    queryClient.clear();
    setIsSignedIn(false);
  }, [queryClient]);

  const value = useMemo(
    () => ({ isLoading, isSignedIn, signIn, register, signInWithGoogle, signOut }),
    [isLoading, isSignedIn, signIn, register, signInWithGoogle, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
