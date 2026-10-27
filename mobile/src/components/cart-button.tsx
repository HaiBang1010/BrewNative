import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useCartCount } from "@/stores/cart";

/** Cart icon with a badge, for screen headers. Re-renders only when the count changes. */
export function CartButton() {
  const count = useCartCount();

  return (
    <Link href="/cart" asChild className="mr-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Giỏ hàng, ${count} món`}
        hitSlop={8}
        className="px-2 active:opacity-60"
      >
        <Ionicons name="bag-handle-outline" size={24} color="#7C4A2D" />
        {count > 0 ? (
          <View className="absolute -top-1 right-0 min-w-[18px] items-center rounded-full bg-red-600 px-1">
            <Text className="text-[11px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}
