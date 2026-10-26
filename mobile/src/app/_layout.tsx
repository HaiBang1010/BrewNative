import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

/**
 * Signed out: only (auth) screens exist. Signed in: only (app) screens exist.
 * Opening a screen of the unavailable group (e.g. "/" while signed out, or a
 * deep link) goes to `redirectTo`. When `isSignedIn` flips, the history of the
 * group that became unavailable is dropped.
 */
function RootNavigator() {
  const { isSignedIn } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn} redirectTo="/login">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
