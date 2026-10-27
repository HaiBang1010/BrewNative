import { Ionicons } from "@react-native-vector-icons/ionicons";
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "expo-router/js-tabs";
import { use, useState, type ComponentProps } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { COLORS } from "@/constants/theme";

const ACTIVE_COLOR = COLORS.brand;
const INACTIVE_COLOR = COLORS.inkMuted;
/** Gap between the pill's edge and the highlighted tab. */
const INNER_PADDING = 6;

type IconProps = ComponentProps<typeof Ionicons>;
type IconName = IconProps["name"];

/** `tabBarIcon` option: the filled Ionicon for the selected tab, its `-outline` twin for the others. */
export function tabBarIcon(name: IconName) {
  return ({ color, size, focused }: { color: IconProps["color"]; size: number; focused: boolean }) => (
    <Ionicons name={focused ? name : (`${name}-outline` as IconName)} color={color} size={size} />
  );
}

/**
 * Pill-shaped tab bar that floats above the screen content. It is absolutely positioned,
 * so screens scroll underneath it: pad scroll content with `useBottomTabBarHeight()`.
 */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  // Tells the navigator how much of the screen we cover, which feeds useBottomTabBarHeight().
  const onHeightChange = use(BottomTabBarHeightCallbackContext);
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth ? (barWidth - INNER_PADDING * 2) / state.routes.length : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    // Decelerate into place without overshooting.
    transform: [
      { translateX: withTiming(state.index * tabWidth, { duration: 250, easing: Easing.out(Easing.cubic) }) },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0 px-5"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      <View
        className="flex-row rounded-full border border-stone-100 bg-white"
        style={{
          padding: INNER_PADDING,
          shadowColor: COLORS.ink,
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 ? (
          <Animated.View
            className="absolute bottom-1.5 top-1.5 rounded-full bg-brand-50"
            style={[{ left: INNER_PADDING }, indicatorStyle]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = index === state.index;
          const color = focused
            ? (options.tabBarActiveTintColor ?? ACTIVE_COLOR)
            : (options.tabBarInactiveTintColor ?? INACTIVE_COLOR);
          const label = options.title ?? route.name;

          // Same events as the default tab bar, so listeners like tabPress keep working.
          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
              // Icon only: the title stays as the accessibility label for screen readers.
              className="flex-1 items-center py-3 active:opacity-70"
            >
              <View>
                {options.tabBarIcon?.({ focused, color, size: 24 })}
                {options.tabBarBadge != null ? (
                  <View className="absolute -right-2.5 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-1">
                    <Text className="text-[10px] font-bold leading-3 text-white">
                      {typeof options.tabBarBadge === "number" && options.tabBarBadge > 99
                        ? "99+"
                        : options.tabBarBadge}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
