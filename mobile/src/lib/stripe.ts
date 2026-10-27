import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/**
 * Where Stripe sends the user back after a bank's 3-D Secure page. Expo Go needs
 * the "/--/" form (see docs.expo.dev/versions/v58.0.0/sdk/stripe).
 */
export const STRIPE_URL_SCHEME =
  Constants.appOwnership === 'expo' ? Linking.createURL('/--/') : Linking.createURL('');
