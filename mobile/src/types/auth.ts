/** Tokens returned by /auth/login and /auth/refresh, kept in the keychain. */
export type Tokens = { accessToken: string; refreshToken: string };

export type TokenStore = {
  get(): Promise<Tokens | null>;
  set(tokens: Tokens | null): Promise<void>;
};
