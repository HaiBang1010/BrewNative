import type { WsReply, ChatMessage, ChatMessagePage, ChatSummary } from '@/types/realtime';
import { ApiError } from '@/utils/api-error';
import { api } from './session';
import { socket } from './socket';

const ACK_TIMEOUT_MS = 5_000;

/**
 * Sends a chat message over the WebSocket when connected, otherwise (or if the
 * socket doesn't answer in time) over REST. Both carry the same `clientId`, so
 * sending twice stores the message once. Used by customers and staff alike.
 */
export async function sendChatMessage(
  socketPayload: { body: string; clientId: string; conversationId?: string },
  restPath: string,
): Promise<ChatMessage> {
  if (socket.connected) {
    try {
      const reply: WsReply<ChatMessage> = await socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck('message:send', socketPayload);
      if (reply.ok) return reply.data;
      const messages = Array.isArray(reply.error.message)
        ? reply.error.message
        : [reply.error.message];
      throw new ApiError(reply.error.status, messages[0], messages);
    } catch (error) {
      // A real "no" from the server (e.g. 429) is final; a timeout falls back to REST.
      if (error instanceof ApiError) throw error;
    }
  }
  const { body, clientId } = socketPayload;
  return api.post<ChatMessage>(restPath, { body, clientId });
}

/** The signed-in customer's chat with the shop (one conversation per customer). */
export const chatService = {
  getSummary: (signal?: AbortSignal) => api.get<ChatSummary>('/chat', { signal }),

  getMessages: (before: string | undefined, signal?: AbortSignal) =>
    api.get<ChatMessagePage>(`/chat/messages?limit=30${before ? `&before=${before}` : ''}`, {
      signal,
    }),

  send: (body: string, clientId: string) =>
    sendChatMessage({ body, clientId }, '/chat/messages'),

  markRead: () => api.post<void>('/chat/read'),
};
