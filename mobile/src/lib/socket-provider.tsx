import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { api } from '@/services/session';
import { socket } from '@/services/socket';
import type { MessageNewEvent, OrderUpdatedEvent } from '@/types/realtime';
import { refreshMenuQueries, refreshStoreQueries } from './catalog-cache';
import { upsertMessage, type ChatPages } from '@/utils/chat-cache';
import { useAuth } from './auth-provider';
import { queryKeys } from './query-keys';

type SocketState = { isConnected: boolean };

const SocketContext = createContext<SocketState>({ isConnected: false });

/**
 * Keeps the WebSocket connected while the user is signed in, and turns server
 * events into cache updates, so screens using hooks/ refresh by themselves.
 *
 * The database stays the source of truth: events only say "something changed".
 * After every (re)connect the cached orders and chat are refetched, because events
 * sent while disconnected are not replayed.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Connect while signed in.
  useEffect(() => {
    if (!isSignedIn) return;
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [isSignedIn]);

  // Connection lifecycle.
  useEffect(() => {
    if (!isSignedIn) return;

    async function reconnectWithFreshToken() {
      // Null means the refresh token was rejected too: the api client then signs
      // the user out, which disconnects through the effect above.
      const token = await api.refreshAccessToken().catch(() => null);
      if (token) socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
      void queryClient.invalidateQueries({ queryKey: ['chat'] });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      // menu:updated / stores:updated sent while offline are lost too.
      refreshMenuQueries(queryClient);
      refreshStoreQueries(queryClient);
    };
    const onDisconnect = () => setIsConnected(false);
    // The server disconnects when the access token expires. Socket.IO does not
    // reconnect after a server-side disconnect, so do it after refreshing.
    const onSessionExpired = () => void reconnectWithFreshToken();
    // Rejected at the handshake, e.g. the saved access token had already expired.
    const onConnectError = (error: Error) => {
      if (error.message === 'Invalid or expired access token') void reconnectWithFreshToken();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('session:expired', onSessionExpired);
    socket.on('connect_error', onConnectError);

    // Phones close sockets of apps in the background; reconnect on return.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !socket.connected) socket.connect();
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('session:expired', onSessionExpired);
      socket.off('connect_error', onConnectError);
      appState.remove();
    };
  }, [isSignedIn, queryClient]);

  // Server events → cache.
  useEffect(() => {
    const onOrderUpdated = (event: OrderUpdatedEvent) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(event.orderId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      // Staff devices are in the "staff" room and receive every order's updates.
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffOrder(event.orderId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffOrders });
      // A paid, cancelled or completed order changes the sales figures.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    };
    const onMessageNew = (event: MessageNewEvent) => {
      queryClient.setQueryData<ChatPages>(queryKeys.chatMessages, (data) =>
        upsertMessage(data, event.message),
      );
      queryClient.setQueryData<ChatPages>(queryKeys.staffMessages(event.conversationId), (data) =>
        upsertMessage(data, event.message),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.chatSummary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffConversations });
    };
    const onConversationRead = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chatSummary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffConversations });
    };

    // An admin changed the menu or a store (maybe on this device): refetch what is cached.
    // Prices in the cart are checked again too, since the cart screen reads the products.
    const onMenuUpdated = () => refreshMenuQueries(queryClient);
    const onStoresUpdated = () => refreshStoreQueries(queryClient);

    socket.on('order:updated', onOrderUpdated);
    socket.on('message:new', onMessageNew);
    socket.on('conversation:read', onConversationRead);
    socket.on('menu:updated', onMenuUpdated);
    socket.on('stores:updated', onStoresUpdated);
    return () => {
      socket.off('order:updated', onOrderUpdated);
      socket.off('message:new', onMessageNew);
      socket.off('conversation:read', onConversationRead);
      socket.off('menu:updated', onMenuUpdated);
      socket.off('stores:updated', onStoresUpdated);
    };
  }, [queryClient]);

  return <SocketContext value={{ isConnected }}>{children}</SocketContext>;
}

/** Whether the WebSocket is connected right now (e.g. to show "offline"). */
export function useSocket(): SocketState {
  return use(SocketContext);
}
