import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Loading placeholders shaped like the content, for the first load of a screen
 * whose layout is known (menu grid, order list, product...). Spinners stay for
 * actions (buttons), pull-to-refresh and small parts.
 *
 *   <SkeletonGroup>
 *     <Skeleton className="h-32 rounded-xl" />
 *   </SkeletonGroup>
 */

/** 0 → 1 → 0..., shared so every block of a group pulses together. */
const PulseContext = createContext<SharedValue<number> | null>(null);

/** Below this, the data usually arrives first: showing a skeleton would only flash. */
const DEFAULT_DELAY_MS = 300;

type SkeletonGroupProps = {
  children: ReactNode;
  className?: string;
  /** Wait this long before showing anything. */
  delay?: number;
};

export function SkeletonGroup({ children, className, delay = DEFAULT_DELAY_MS }: SkeletonGroupProps) {
  const [visible, setVisible] = useState(delay <= 0);
  const pulse = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (delay <= 0) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!visible || reduceMotion) return;
    pulse.set(
      withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
    return () => cancelAnimation(pulse);
  }, [visible, reduceMotion, pulse]);

  if (!visible) return null;
  return (
    <PulseContext value={pulse}>
      <Animated.View
        entering={FadeIn.duration(150)}
        className={className}
        accessible
        accessibilityLabel="Đang tải"
        accessibilityRole="progressbar"
      >
        {children}
      </Animated.View>
    </PulseContext>
  );
}

/** One grey block. Size and corners come from `className` (h-4 w-1/2 rounded...). */
export function Skeleton({ className = '', style }: { className?: string; style?: StyleProp<ViewStyle> }) {
  const pulse = use(PulseContext);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse ? 1 - pulse.get() * 0.5 : 1,
  }));

  return <Animated.View className={`bg-line-light ${className}`} style={[animatedStyle, style]} />;
}
