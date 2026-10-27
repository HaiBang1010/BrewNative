import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useFocusEffect } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  TextInput,
  View,
  type ScrollViewProps,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorView, LoadingView } from "@/components/ui/screen-state";
import { Text } from "@/components/ui/text";
import { useSocket } from "@/lib/socket-provider";
import type { ChatMessage, ChatMessagePage } from "@/types/realtime";
import { flattenMessages, type ChatPages } from "@/utils/chat-cache";
import { errorMessage } from "@/utils/errors";
import { uuid } from "@/utils/uuid";
import { ChatScrollView } from "./chat-scroll-view";
import { COLORS } from "@/constants/theme";

/** A message typed here and not confirmed by the server yet. */
type Pending = { clientId: string; body: string; failed: boolean };

/** One row of the list: a stored message, or one still being sent. */
type Row =
  | { kind: "message"; message: ChatMessage }
  | { kind: "pending"; pending: Pending };

type ChatThreadProps = {
  /** An infinite query of messages, newest first (useChatMessages / useStaffMessages). */
  messages: {
    data: { pages: ChatMessagePage[]; pageParams: unknown[] } | undefined;
    isPending: boolean;
    error: unknown;
    refetch: () => unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
  };
  /** A send mutation's `mutate` (useSendMessage / useSendStaffMessage). */
  send: (
    message: { body: string; clientId: string },
    callbacks: { onError: (error: unknown) => void },
  ) => void;
  /** Marks the conversation read; called on focus and when a new message arrives. */
  onRead: () => void;
  /** Which messages go on the right, in the brand color. */
  isMine: (message: ChatMessage) => boolean;
  /** Show the sender's name above messages from the other side. */
  showSenderName?: boolean;
  emptyText: string;
};

/**
 * A full chat screen body: message list (newest at the bottom, older pages load
 * when scrolling up), sending with retry, and the input bar. Used by the customer
 * chat (app/(app)/chat.tsx) and the staff chat (app/admin/chats/[id].tsx).
 */
export function ChatThread({
  messages,
  send,
  onRead,
  isMine,
  showSenderName = true,
  emptyText,
}: ChatThreadProps) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { isConnected } = useSocket();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);

  const stored = flattenMessages(messages.data as ChatPages | undefined);
  const newestId = stored[0]?.id;

  // Read while the screen is open: on focus, and whenever a new message shows up.
  useFocusEffect(
    useCallback(() => {
      if (newestId) onRead();
      // Re-run only when a newer message shows up, not when onRead changes identity.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newestId]),
  );

  // Hide a pending bubble once the server's copy (same clientId) is in the list,
  // whether it arrived via the send's reply or the `message:new` event.
  // Derived while rendering, so no extra render; confirmed ones are pruned on the next send.
  const confirmedIds = new Set(stored.map((m) => m.clientId).filter(Boolean));
  const unconfirmed = pending.filter((p) => !confirmedIds.has(p.clientId));

  function deliver(item: Pending) {
    setSendError(null);
    setPending((current) =>
      current.some((p) => p.clientId === item.clientId)
        ? current.map((p) =>
            p.clientId === item.clientId ? { ...p, failed: false } : p,
          )
        : // New message: also forget bubbles the server has confirmed since.
          [
            { ...item, failed: false },
            ...current.filter((p) => !confirmedIds.has(p.clientId)),
          ],
    );
    send(
      { body: item.body, clientId: item.clientId },
      {
        onError: (error: unknown) => {
          setSendError(errorMessage(error));
          setPending((current) =>
            current.map((p) =>
              p.clientId === item.clientId ? { ...p, failed: true } : p,
            ),
          );
        },
      },
    );
  }

  function submit() {
    const body = text.trim();
    if (!body) return;
    setText("");
    // The clientId stays the same on retries, so the server stores it only once.
    deliver({ clientId: uuid(), body, failed: false });
  }

  // Messages lift by the keyboard height minus the bottom safe area, the same
  // distance the input bar moves (see KeyboardStickyView below).
  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => (
      <ChatScrollView
        {...props}
        inverted
        keyboardLiftBehavior="always"
        offset={insets.bottom}
      />
    ),
    [insets.bottom],
  );

  if (messages.isPending) return <LoadingView />;
  if (messages.error)
    return <ErrorView error={messages.error} onRetry={messages.refetch} />;

  const rows: Row[] = [
    ...unconfirmed.map((p): Row => ({ kind: "pending", pending: p })),
    ...stored.map((m): Row => ({ kind: "message", message: m })),
  ];

  return (
    // The native header floats over the screen on iOS 26+: start below it.
    // Keyboard handling is done by the scroll view and the sticky input bar,
    // not by resizing this container.
    <View
      style={{ flex: 1, paddingTop: Platform.OS === "ios" ? headerHeight : 0 }}
    >
      {!isConnected ? (
        <Text className="bg-amber-100 py-1 text-center text-sm text-amber-800">
          Đang kết nối lại… tin nhắn mới có thể đến chậm
        </Text>
      ) : null}

      <FlatList
        // Inverted: index 0 is drawn at the bottom, so the newest message sits
        // above the input and older pages load when scrolling up.
        inverted
        renderScrollComponent={renderScrollComponent}
        data={rows}
        keyExtractor={(row) =>
          row.kind === "message" ? row.message.id : row.pending.clientId
        }
        contentContainerClassName="gap-2 px-4 py-3"
        keyboardDismissMode="interactive"
        onEndReached={() => {
          if (messages.hasNextPage && !messages.isFetchingNextPage)
            void messages.fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          messages.isFetchingNextPage ? (
            <ActivityIndicator className="py-3" color={COLORS.brand} />
          ) : undefined
        }
        ListEmptyComponent={
          // Inverted lists flip their children too; flip back so the text reads normally.
          <View
            className="items-center gap-2 py-16"
            style={{ transform: [{ scaleY: -1 }] }}
          >
            <Ionicons name="chatbubbles-outline" size={40} color={COLORS.line} />
            <Text className="text-center text-ink-muted">{emptyText}</Text>
          </View>
        }
        renderItem={({ item: row }) =>
          row.kind === "message" ? (
            <Bubble
              body={row.message.body}
              mine={isMine(row.message)}
              senderName={
                showSenderName ? row.message.sender?.fullName : undefined
              }
              time={row.message.createdAt}
            />
          ) : (
            <Bubble
              body={row.pending.body}
              mine
              status={row.pending.failed ? "failed" : "sending"}
              onRetry={() => deliver(row.pending)}
            />
          )
        }
      />

      {/* Rides on top of the keyboard. When open, the bottom safe-area padding
          slides under the keyboard (offset.opened), so the bar sits right on it. */}
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        {sendError ? (
          <Text className="px-4 pb-1 text-sm text-red-500">{sendError}</Text>
        ) : null}
        <View
          className="flex-row items-end gap-2 border-t border-line bg-white px-3 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Nhắn cho quán…"
            placeholderTextColor={COLORS.inkMuted}
            multiline
            maxLength={2000}
            className="max-h-32 flex-1 rounded-2xl bg-line-light px-4 py-2.5 text-base text-ink"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gửi"
            disabled={!text.trim()}
            onPress={submit}
            className={`h-11 w-11 items-center justify-center rounded-full bg-brand ${text.trim() ? "" : "opacity-40"}`}
          >
            <Ionicons name="send" size={18} color={COLORS.white} />
          </Pressable>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function Bubble({
  body,
  mine,
  senderName,
  time,
  status,
  onRetry,
}: {
  body: string;
  mine: boolean;
  senderName?: string;
  time?: string;
  status?: "sending" | "failed";
  onRetry?: () => void;
}) {
  return (
    <View
      className={`max-w-[80%] gap-1 ${mine ? "self-end items-end" : "self-start items-start"}`}
    >
      {!mine && senderName ? (
        <Text className="px-1 text-xs text-ink-muted">{senderName}</Text>
      ) : null}
      <View
        className={`rounded-2xl px-4 py-2.5 ${mine ? "rounded-br-md bg-brand" : "rounded-bl-md bg-white"} ${status === "sending" ? "opacity-60" : ""}`}
      >
        <Text className={`text-base ${mine ? "text-white" : "text-ink"}`}>
          {body}
        </Text>
      </View>
      {status === "failed" ? (
        <Pressable onPress={onRetry} hitSlop={6}>
          <Text className="px-1 text-xs text-red-500">
            Chưa gửi được · Chạm để gửi lại
          </Text>
        </Pressable>
      ) : time ? (
        <Text className="px-1 text-xs text-ink-muted">
          {new Date(time).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      ) : null}
    </View>
  );
}
