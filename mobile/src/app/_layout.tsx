import '../global.css';
import '@/lib/nativewind-interop';

import {
  BeVietnamPro_300Light,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  useFonts,
} from '@expo-google-fonts/be-vietnam-pro';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AnimatedSplash } from '@/components/animated-splash';
import { OfflineBanner } from '@/components/offline-banner';
import { useAppSplash } from '@/hooks/app-resume';
import { AppProviders } from '@/lib/app-providers';
import { useAuth } from '@/lib/auth-provider';

// Keep the native splash up until React can draw: AnimatedSplash then takes over
// with the same picture and hides it (see components/animated-splash.tsx).
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Bundled with the JS (no native rebuild needed). On error, text falls back to the system font.
  // Keys are the fonts' real PostScript names: iOS then finds them directly. Under any other
  // name (e.g. "BeVietnamPro_700Bold") it goes through an alias that React Native's text measuring
  // doesn't see, so text is measured with the system font and drawn wider: the end gets cut off.
  const [fontsLoaded, fontError] = useFonts({
    'BeVietnamPro-Light': BeVietnamPro_300Light,
    'BeVietnamPro-Regular': BeVietnamPro_400Regular,
    'BeVietnamPro-Medium': BeVietnamPro_500Medium,
    'BeVietnamPro-SemiBold': BeVietnamPro_600SemiBold,
    'BeVietnamPro-Bold': BeVietnamPro_700Bold,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProviders>
      <RootNavigator />
      <StatusBar style="dark" />
    </AppProviders>
  );
}

/**
 * Which screens exist depends on who is signed in:
 * - signed out: only (auth) (login, register);
 * - customer: only (app) (menu, cart, orders, chat);
 * - staff/admin: only admin (order queue, customer chats).
 * Opening a screen of an unavailable group (e.g. "/" while signed out, or a deep
 * link) goes to that group's `redirectTo`, i.e. the home of the user's own area.
 * When the state changes, the history of the group that became unavailable is dropped.
 */
function RootNavigator() {
  const { isLoading, isSignedIn, isStaff } = useAuth();
  // On a cold start, and again when the app comes back after a long absence.
  const { splash, hideSplash } = useAppSplash({ isLoading, isSignedIn, isStaff });

  const home = !isSignedIn ? '/login' : isStaff ? '/admin/orders' : '/';

  return (
    <>
      {/* Screens appear under the splash as soon as the sign-in state is known. */}
      {isLoading ? null : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={isSignedIn && !isStaff} redirectTo={home}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={isSignedIn && isStaff} redirectTo={home}>
            <Stack.Screen name="admin" />
          </Stack.Protected>
          <Stack.Protected guard={!isSignedIn} redirectTo={home}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
      <OfflineBanner />
      {splash ? (
        <AnimatedSplash
          key={splash.key}
          coldStart={splash.coldStart}
          ready={splash.ready}
          onFinish={hideSplash}
        />
      ) : null}
    </>
  );
}
