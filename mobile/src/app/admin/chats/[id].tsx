import { Stack, useLocalSearchParams } from 'expo-router';
import { ChatThread } from '@/components/chat/chat-thread';
import {
  useMarkConversationRead,
  useSendStaffMessage,
  useStaffMessages,
} from '@/hooks/staff';

/** Staff side of one customer's chat. Any staff member can answer. */
export default function StaffChatScreen() {
  // `name` comes from the list so the header shows it before anything loads.
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const messages = useStaffMessages(id);
  const send = useSendStaffMessage(id);
  const markRead = useMarkConversationRead(id);

  return (
    <>
      <Stack.Screen options={{ title: name ?? 'Khách hàng' }} />
      <ChatThread
        messages={messages}
        send={send.mutate}
        onRead={() => markRead.mutate()}
        // The shop speaks with one voice: every staff message is "ours".
        isMine={(message) => message.sender?.role !== 'customer'}
        emptyText="Chưa có tin nhắn"
      />
    </>
  );
}
