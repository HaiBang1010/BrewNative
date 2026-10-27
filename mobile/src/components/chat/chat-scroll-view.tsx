import { forwardRef } from "react";
import type { ScrollViewProps } from "react-native";
import {
  KeyboardChatScrollView,
  type KeyboardChatScrollViewProps,
  type KeyboardChatScrollViewRef,
} from "react-native-keyboard-controller";

/**
 * The scroll view behind the chat FlatList (passed as `renderScrollComponent`).
 * KeyboardChatScrollView moves the messages up with the keyboard, frame by frame,
 * including while the user drags the keyboard down. It handles the insets itself,
 * so iOS's automatic insets are turned off (as the library's docs require).
 */
export const ChatScrollView = forwardRef<
  KeyboardChatScrollViewRef,
  ScrollViewProps & KeyboardChatScrollViewProps
>((props, ref) => (
  <KeyboardChatScrollView
    ref={ref}
    automaticallyAdjustContentInsets={false}
    contentInsetAdjustmentBehavior="never"
    {...props}
  />
));
ChatScrollView.displayName = "ChatScrollView";
