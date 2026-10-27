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
import { queryKeys } from '@/lib/query-keys';
import { authService } from '@/services/auth.service';
import { getGoogleIdToken, signOutOfGoogle } from '@/services/google-sign-in';
import { onSessionExpired, tokenStore } from '@/services/session';
import type { AuthResponse } from '@/types/api';

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

/**
 * Holds the signed-in state for the whole app. The API calls themselves live in
 * services/auth.service.ts; this provider decides what they mean for the app
 * (save tokens, fill the cache, switch between the (auth) and (app) screens).
 */
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
      queryClient.setQueryData(queryKeys.me, response.user);
      setIsSignedIn(true);
    },
    [queryClient],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      await startSession(await authService.login(email, password));
    },
    [startSession],
  );

  const register = useCallback(
    async (fullName: string, email: string, password: string) => {
      await startSession(await authService.register(fullName, email, password));
    },
    [startSession],
  );

  const signInWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return false;
    await startSession(await authService.loginWithGoogle(idToken));
    return true;
  }, [startSession]);

  const signOut = useCallback(async () => {
    const tokens = await tokenStore.get();
    // Tell the backend to revoke the refresh token. If that fails (offline),
    // still sign out locally: the token expires on its own.
    if (tokens) {
      await authService.logout(tokens.refreshToken).catch(() => undefined);
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
