import { io, type Socket } from 'socket.io-client';
import { API_URL, tokenStore } from './session';

/** Socket.IO lives at the server root (path /socket.io), not under /api. */
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * The app's single WebSocket. Created disconnected; SocketProvider connects it
 * while the user is signed in.
 *
 * `auth` is a function, so every (re)connect sends the access token saved at that
 * moment, including one refreshed after the previous token expired.
 */
export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
  auth: (cb) => {
    void tokenStore.get().then((tokens) => cb({ token: tokens?.accessToken }));
  },
});
