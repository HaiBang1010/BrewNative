import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AuthState = {
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * TEMPORARY: sign-in is only a flag in memory so the navigation guards can be
 * tried out. The next step replaces this with the backend (/api/auth/login,
 * tokens in expo-secure-store, refresh).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  const value = useMemo(
    () => ({
      isSignedIn,
      signIn: () => setIsSignedIn(true),
      signOut: () => setIsSignedIn(false),
    }),
    [isSignedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
