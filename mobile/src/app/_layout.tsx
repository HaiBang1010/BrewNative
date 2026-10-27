import '../global.css';

import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/lib/app-providers';
import { useAuth } from '@/lib/auth-provider';

// Keep the splash screen up until we know whether the user is signed in,
// so the login screen doesn't flash before jumping to the home screen.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
      <StatusBar style="dark" />
    </AppProviders>
  );
}

/**
 * Signed out: only (auth) screens exist. Signed in: only (app) screens exist.
 * Opening a screen of the unavailable group (e.g. "/" while signed out, or a
 * deep link) goes to `redirectTo`. When `isSignedIn` flips, the history of the
 * group that became unavailable is dropped.
 */
function RootNavigator() {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) return null;
  SplashScreen.hide();

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
