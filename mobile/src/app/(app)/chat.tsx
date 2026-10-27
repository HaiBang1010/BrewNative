import { ChatThread } from '@/components/chat/chat-thread';
import { useChatMessages, useMarkChatRead, useSendMessage } from '@/hooks/chat';
import { useMe } from '@/hooks/queries';

/** The customer's chat with the shop. */
export default function ChatScreen() {
  const { data: me } = useMe();
  const messages = useChatMessages();
  const send = useSendMessage();
  const markRead = useMarkChatRead();

  return (
    <ChatThread
      messages={messages}
      send={send.mutate}
      onRead={() => markRead.mutate()}
      isMine={(message) => message.senderId === me?.id}
      emptyText="Hỏi quán bất cứ điều gì: giờ mở cửa, món mới, đơn của bạn…"
    />
  );
}
