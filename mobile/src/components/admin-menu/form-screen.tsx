import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';

/**
 * Layout of the admin edit screens: the form scrolls (the focused field stays
 * above the keyboard), the actions stay in a bar at the bottom.
 */
export function FormScreen({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1">
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 px-5 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </KeyboardAwareScrollView>
      <View className="gap-3 rounded-t-2xl bg-white px-6 pt-4" style={{ paddingBottom: insets.bottom + 12 }}>
        {footer}
      </View>
    </View>
  );
}

/** A white card grouping a few fields, with an optional title and action on the right. */
export function FormSection({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="gap-4 rounded-2xl bg-white p-4">
      {title || action ? (
        <View className="flex-row items-center justify-between gap-3">
          {title ? <Text className="text-base font-semibold text-ink">{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}
