import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Google Sign-In is native code that Expo Go doesn't include. It only works in a
 * development build (`npm run ios` / `npm run android`) or a store build.
 */
export const isGoogleSignInAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && !!webClientId;

let module: GoogleSignInModule | null = null;

/** Loaded on first use, so merely opening the app in Expo Go doesn't crash. */
function load(): GoogleSignInModule {
  if (!module) {
    // require, not import: a static import would load the native module at startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    module = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
    // The ID token's audience is the Web client ID; the backend accepts it
    // because it is listed in GOOGLE_CLIENT_IDS.
    module.GoogleSignin.configure({ webClientId, iosClientId });
  }
  return module;
}

/** Shows Google's account picker. Returns the ID token, or null if the user cancelled. */
export async function getGoogleIdToken(): Promise<string | null> {
  const { GoogleSignin, isSuccessResponse } = load();
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  if (!response.data.idToken) throw new Error('Google không trả về ID token');
  return response.data.idToken;
}

/** Lets the next sign-in show the account picker again instead of reusing the last account. */
export async function signOutOfGoogle(): Promise<void> {
  if (!isGoogleSignInAvailable || !module) return;
  try {
    await module.GoogleSignin.signOut();
  } catch {
    // Not signed in with Google: nothing to do.
  }
}
