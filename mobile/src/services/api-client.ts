import type { TokenStore, Tokens } from '@/types/auth';
import { ApiError } from '@/utils/api-error';

/**
 * Small fetch wrapper for the backend. No React Native imports: it only needs fetch.
 *
 * - Adds `Authorization: Bearer <accessToken>`.
 * - On 401, refreshes the access token once and retries the request.
 * - Only one refresh runs at a time: the backend treats a reused refresh token as
 *   stolen and signs the user out everywhere, so parallel refreshes must not happen.
 */

type RequestOptions = {
  body?: unknown;
  /** Send the access token (default true). Login/register send false. */
  auth?: boolean;
  signal?: AbortSignal;
};

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(options: {
  baseUrl: string;
  tokens: TokenStore;
  /** Called when the refresh token is rejected: the user must sign in again. */
  onSessionExpired?: () => void;
}) {
  const { baseUrl, tokens } = options;
  let refreshing: Promise<string | null> | null = null;

  function send(
    method: string,
    path: string,
    accessToken: string | undefined,
    opts: RequestOptions,
  ) {
    // A FormData body (file upload) is sent as is: fetch sets the multipart Content-Type itself.
    const isForm = opts.body instanceof FormData;
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined && !isForm && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  }

  /** Returns a new access token, or null if the session is over. Concurrent callers share one refresh. */
  function refreshAccessToken(): Promise<string | null> {
    refreshing ??= (async () => {
      const current = await tokens.get();
      if (!current) return null;
      const res = await send('POST', '/auth/refresh', undefined, {
        body: { refreshToken: current.refreshToken },
      });
      if (res.status === 401) {
        await tokens.set(null);
        options.onSessionExpired?.();
        return null;
      }
      const data = await parse<Tokens>(res);
      await tokens.set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      return data.accessToken;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const useAuth = opts.auth ?? true;
    // Wait for a refresh in progress instead of sending a token that is being replaced.
    if (useAuth && refreshing) await refreshing;
    const accessToken = useAuth ? (await tokens.get())?.accessToken : undefined;

    let res = await send(method, path, accessToken, opts);
    if (res.status === 401 && useAuth && accessToken) {
      // Another request may have refreshed while this one was in flight.
      const latest = (await tokens.get())?.accessToken;
      const fresh = latest && latest !== accessToken ? latest : await refreshAccessToken();
      if (fresh) res = await send(method, path, fresh, opts);
    }
    return parse<T>(res);
  }

  return {
    get: <T>(path: string, opts?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, opts),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
      request<T>('POST', path, { ...opts, body }),
    patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
      request<T>('PATCH', path, { ...opts, body }),
    put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
      request<T>('PUT', path, { ...opts, body }),
    delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
    /**
     * Gets a new access token (for the WebSocket, which can't retry an HTTP request).
     * Shares the in-flight refresh with HTTP requests. Null = the session is over.
     */
    refreshAccessToken,
  };
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data: unknown = text ? safeJson(text) : undefined;
  if (res.ok) return data as T;

  const raw = (data as { message?: unknown } | undefined)?.message;
  const messages = Array.isArray(raw)
    ? raw.map(String)
    : [typeof raw === 'string' ? raw : `Request failed (${res.status})`];
  throw new ApiError(res.status, messages[0], messages);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
