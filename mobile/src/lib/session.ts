import * as SecureStore from 'expo-secure-store';
import { createApiClient, type TokenStore, type Tokens } from './api';

/**
 * The app's single API client, with tokens kept in the device keychain
 * (iOS Keychain / Android Keystore) via expo-secure-store.
 */

const TOKENS_KEY = 'brew.tokens';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3100/api';

// Reading the keychain is slow-ish, so keep a copy in memory after the first read.
let cached: Tokens | null | undefined;

export const tokenStore: TokenStore = {
  async get() {
    if (cached === undefined) {
      const raw = await SecureStore.getItemAsync(TOKENS_KEY);
      cached = raw ? (JSON.parse(raw) as Tokens) : null;
    }
    return cached;
  },
  async set(tokens) {
    cached = tokens;
    if (tokens) await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
    else await SecureStore.deleteItemAsync(TOKENS_KEY);
  },
};

type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();

/** AuthProvider subscribes to this to switch to the signed-out screens. */
export function onSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export const api = createApiClient({
  baseUrl: API_URL,
  tokens: tokenStore,
  onSessionExpired: () => sessionExpiredListeners.forEach((listener) => listener()),
});
