import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { COLORS } from "@/constants/theme";
import { useCartCount } from "@/stores/cart";

type CartButtonProps = {
  /** `header`: plain icon for screen headers. `tile`: brown square, next to the home search bar. */
  variant?: "header" | "tile";
};

/** Cart icon with a badge. Re-renders only when the count changes. */
export function CartButton({ variant = "header" }: CartButtonProps) {
  const count = useCartCount();
  const tile = variant === "tile";

  return (
    <Link href="/cart" asChild className={tile ? "" : "mr-4"}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Giỏ hàng, ${count} món`}
        hitSlop={8}
        className={
          tile
            ? "h-[52px] w-[52px] items-center justify-center rounded-xl bg-brand active:bg-brand-600"
            : "px-2 active:opacity-60"
        }
      >
        <Ionicons
          name="bag-handle-outline"
          size={tile ? 22 : 24}
          color={tile ? COLORS.white : COLORS.ink}
        />
        {count > 0 ? (
          <View
            className={`absolute min-w-[18px] items-center rounded-full bg-promo px-1 ${
              tile ? "-right-1.5 -top-1.5 border-2 border-night" : "-top-1 right-0"
            }`}
          >
            <Text className="text-[11px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}
