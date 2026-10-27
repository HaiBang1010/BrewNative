import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '@/constants/theme';
import { Text } from './text';
import { errorMessage } from '@/utils/errors';
import { Button } from './button';

/** Full-screen spinner while a query loads for the first time. */
export function LoadingView() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <ActivityIndicator size="large" color={COLORS.brand} />
    </View>
  );
}

/** Full-screen error with a retry button, for a query that failed. */
export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-surface px-8">
      <Text className="text-center text-base text-ink-soft">{errorMessage(error)}</Text>
      {onRetry ? <Button title="Thử lại" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyView({ text }: { text: string }) {
  return (
    <View className="items-center py-16">
      <Text className="text-base text-ink-muted">{text}</Text>
    </View>
  );
}
