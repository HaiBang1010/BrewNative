import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import { useIsOnline } from '@/lib/query-client';

/** How long "Đã kết nối lại" stays after the connection comes back. */
const BACK_ONLINE_MS = 2500;

/**
 * A pill at the top of every screen while the device has no internet, then
 * "Đã kết nối lại" for a moment once it's back (data refetches by itself).
 * Rendered once, in app/_layout.tsx.
 */
export function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  const [previous, setPrevious] = useState(online);
  const [backOnline, setBackOnline] = useState(false);

  // Track the change while rendering (React's "adjust state on prop change" pattern).
  if (online !== previous) {
    setPrevious(online);
    setBackOnline(online);
  }

  useEffect(() => {
    if (!backOnline) return;
    const timer = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [backOnline]);

  if (online && !backOnline) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 items-center"
      style={{ top: insets.top + 6, zIndex: 5 }}
    >
      <Animated.View
        key={online ? 'online' : 'offline'}
        entering={FadeInUp.duration(250)}
        exiting={FadeOutUp.duration(200)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className={`flex-row items-center gap-2 rounded-full px-4 py-2 ${online ? 'bg-success' : 'bg-night-raised'}`}
        style={{
          shadowColor: COLORS.ink,
          shadowOpacity: 0.2,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name={online ? 'wifi' : 'cloud-offline-outline'} size={16} color={COLORS.white} />
        <Text className="text-sm font-medium text-white">
          {online ? 'Đã kết nối lại' : 'Không có kết nối mạng'}
        </Text>
      </Animated.View>
    </View>
  );
}
