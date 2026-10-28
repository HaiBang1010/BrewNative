import type { Tokens, TokenStore } from '@/types/auth';
import { ApiError } from '@/utils/api-error';
import { createApiClient } from '../api-client';

/**
 * A fake backend with the rules that matter here:
 * - a request needs the current access token, otherwise 401;
 * - /auth/refresh rotates the tokens, and a refresh token can be used only once.
 *   Using one again is what the real backend treats as theft (it signs the user
 *   out everywhere), so a test that sees `reusedRefreshToken` has found the bug.
 */
function createFakeBackend() {
  let generation = 1;
  const state = { refreshCalls: 0, reusedRefreshToken: false, refreshDelayMs: 10 };
  const validAccess = () => `access-${generation}`;
  const validRefresh = () => `refresh-${generation}`;

  const reply = (status: number, body?: unknown) =>
    ({
      status,
      ok: status >= 200 && status < 300,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    }) as Response;

  const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
    const path = url.replace('https://api.test', '');
    if (path === '/auth/refresh') {
      state.refreshCalls += 1;
      const { refreshToken } = JSON.parse(String(init.body)) as { refreshToken: string };
      // Slow enough that other requests can pile up while it runs.
      await new Promise((resolve) => setTimeout(resolve, state.refreshDelayMs));
      if (refreshToken !== validRefresh()) {
        state.reusedRefreshToken = true;
        return reply(401, { message: 'Refresh token reused' });
      }
      generation += 1;
      return reply(200, { accessToken: validAccess(), refreshToken: validRefresh() });
    }
    if (path.startsWith('/auth/')) return reply(200, { path }); // login, register: public
    const auth = (init.headers as Record<string, string>).Authorization;
    if (auth !== `Bearer ${validAccess()}`) return reply(401, { message: 'Unauthorized' });
    return reply(200, { path });
  });

  return { state, fetchMock };
}

function memoryTokenStore(initial: Tokens | null): TokenStore & { current: () => Tokens | null } {
  let tokens = initial;
  return {
    get: async () => tokens,
    set: async (next) => {
      tokens = next;
    },
    current: () => tokens,
  };
}

function setup() {
  const backend = createFakeBackend();
  globalThis.fetch = backend.fetchMock as unknown as typeof fetch;
  const tokens = memoryTokenStore({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  const onSessionExpired = jest.fn();
  const api = createApiClient({ baseUrl: 'https://api.test', tokens, onSessionExpired });
  return { backend, tokens, onSessionExpired, api };
}

const refreshCount = (fetchMock: jest.Mock) =>
  fetchMock.mock.calls.filter(([url]: [string]) => url.endsWith('/auth/refresh')).length;

describe('createApiClient', () => {
  it('sends the access token, but not when auth is false', async () => {
    const { api, backend } = setup();
    await api.get('/me');
    await api.post('/auth/login', { email: 'a' }, { auth: false });

    const [, meInit] = backend.fetchMock.mock.calls[0];
    const [, loginInit] = backend.fetchMock.mock.calls[1];
    expect((meInit.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
    expect((loginInit.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(loginInit.body).toBe(JSON.stringify({ email: 'a' }));
  });

  it('sends a FormData body (image upload) as is, without the JSON content type', async () => {
    const { api, backend } = setup();
    const form = new FormData();
    form.append('file', 'image-bytes');
    await api.post('/admin/products/p/image', form);

    const [, init] = backend.fetchMock.mock.calls[0];
    expect(init.body).toBe(form);
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('refreshes once on 401, saves the new tokens and retries the request', async () => {
    const { api, backend, tokens } = setup();
    // The access token expired; the refresh token is still valid.
    await tokens.set({ accessToken: 'stale', refreshToken: 'refresh-1' });

    await expect(api.get('/orders')).resolves.toEqual({ path: '/orders' });
    expect(refreshCount(backend.fetchMock)).toBe(1);
    expect(tokens.current()).toEqual({ accessToken: 'access-2', refreshToken: 'refresh-2' });
  });

  it('runs a single refresh for many requests that get 401 at the same time', async () => {
    const { api, backend, tokens } = setup();
    await tokens.set({ accessToken: 'stale', refreshToken: 'refresh-1' });

    const results = await Promise.all([
      api.get('/me'),
      api.get('/orders'),
      api.get('/chat'),
      api.refreshAccessToken(), // the WebSocket asking for a token at the same moment
    ]);

    expect(results.slice(0, 3)).toEqual([{ path: '/me' }, { path: '/orders' }, { path: '/chat' }]);
    expect(results[3]).toBe('access-2');
    expect(refreshCount(backend.fetchMock)).toBe(1);
    expect(backend.state.reusedRefreshToken).toBe(false);
  });

  it('makes a request started during a refresh wait for it instead of refreshing again', async () => {
    const { api, backend, tokens } = setup();
    await tokens.set({ accessToken: 'stale', refreshToken: 'refresh-1' });

    const first = api.get('/me');
    // Let the first request get its 401 and start the refresh.
    await new Promise((resolve) => setTimeout(resolve, 1));
    const second = api.get('/orders');

    await expect(Promise.all([first, second])).resolves.toEqual([{ path: '/me' }, { path: '/orders' }]);
    expect(refreshCount(backend.fetchMock)).toBe(1);
    expect(backend.state.reusedRefreshToken).toBe(false);
  });

  it('refreshes again later with the rotated refresh token, never the old one', async () => {
    const { api, backend, tokens } = setup();
    await tokens.set({ accessToken: 'stale', refreshToken: 'refresh-1' });
    await api.get('/me');

    await tokens.set({ accessToken: 'stale-again', refreshToken: tokens.current()!.refreshToken });
    await api.get('/me');

    expect(refreshCount(backend.fetchMock)).toBe(2);
    expect(backend.state.reusedRefreshToken).toBe(false);
    expect(tokens.current()?.refreshToken).toBe('refresh-3');
  });

  it('ends the session when the refresh token is rejected', async () => {
    const { api, tokens, onSessionExpired } = setup();
    await tokens.set({ accessToken: 'stale', refreshToken: 'revoked' });

    await expect(Promise.all([api.get('/me'), api.get('/orders')])).rejects.toMatchObject({
      status: 401,
    });
    expect(tokens.current()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("throws an ApiError with the backend's messages", async () => {
    const { api } = setup();
    globalThis.fetch = jest.fn(async () => ({
      status: 400,
      ok: false,
      text: async () => JSON.stringify({ message: ['email must be an email', 'password too short'] }),
    })) as unknown as typeof fetch;

    const error = await api.post('/auth/register', {}, { auth: false }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: 'email must be an email',
      messages: ['email must be an email', 'password too short'],
    });
  });
});
