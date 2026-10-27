import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { TextField } from "@/components/ui/text-field";
import { errorMessage } from "@/utils/errors";
import { formatVnd } from "@/utils/format";
import { usePayOrder } from "@/hooks/payments";
import { useCancelOrder, useCreateOrder, useStores } from "@/hooks/queries";
import { MAX_QUANTITY, useCart, useCartTotal } from "@/stores/cart";
import type { CartItem } from "@/types/cart";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, storeId, note, setStoreId, setNote, clear } = useCart();
  const total = useCartTotal();
  const { data: stores } = useStores();
  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();
  const payOrder = usePayOrder();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pick the first store if none is chosen yet (or the saved one was closed).
  useEffect(() => {
    if (stores?.length && !stores.some((s) => s.id === storeId)) setStoreId(stores[0].id);
  }, [stores, storeId, setStoreId]);

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Ionicons name="bag-handle-outline" size={56} color="#d6d3d1" />
        <Text className="text-lg font-semibold text-stone-900">Giỏ hàng đang trống</Text>
        <Link href="/menu" asChild>
          <Button title="Xem menu" className="self-stretch" />
        </Link>
      </View>
    );
  }

  /**
   * Pay first, then it's an order. The backend needs an order to price the cart
   * and create the PaymentIntent, so a hidden "unpaid" order is created first;
   * the customer only ever sees it once paid. If they close the payment sheet or
   * paying fails, that order is cancelled and the cart stays as it was.
   */
  async function checkout() {
    if (!storeId) return;
    setError(null);
    setCheckingOut(true);
    let orderId: string | null = null;
    try {
      const order = await createOrder.mutateAsync({
        storeId,
        note: note.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          optionIds: item.options.map((o) => o.id),
        })),
      });
      orderId = order.id;

      const result = await payOrder(order.id);
      if (result.outcome === "cancelled") {
        cancelOrder.mutate(order.id);
        return;
      }
      // Paid: now it is a real order. `replace` so Back doesn't return to the cart.
      clear();
      router.replace({ pathname: "/orders/[id]", params: { id: order.id } });
    } catch (e) {
      // e.g. an item became unavailable (the server says which) or the card failed.
      setError(errorMessage(e));
      if (orderId) cancelOrder.mutate(orderId);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 p-5"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          {items.map((item) => (
            <CartRow key={item.key} item={item} />
          ))}
        </View>

        <View className="gap-2">
          <Text className="text-base font-semibold text-stone-900">Nhận tại</Text>
          <View className="flex-row flex-wrap gap-2">
            {stores?.map((store) => (
              <Chip
                key={store.id}
                label={store.name}
                selected={store.id === storeId}
                onPress={() => setStoreId(store.id)}
              />
            ))}
          </View>
        </View>

        <TextField
          label="Ghi chú cho quán"
          value={note}
          onChangeText={setNote}
          placeholder="Ví dụ: ít đá"
          maxLength={500}
        />
      </ScrollView>

      <View
        className="gap-3 border-t border-stone-200 bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom }}
      >
        {error ? <Text className="text-center text-red-600">{error}</Text> : null}
        <View className="flex-row justify-between">
          <Text className="text-base text-stone-600">Tạm tính</Text>
          <Text className="text-lg font-bold text-stone-900">{formatVnd(total)}</Text>
        </View>
        <Button
          title={`Thanh toán ${formatVnd(total)}`}
          loading={checkingOut}
          disabled={!storeId}
          onPress={checkout}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);

  return (
    <View className="flex-row gap-3 rounded-2xl bg-white p-3">
      <Image
        source={item.imageUrl}
        style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: "#f5f5f4" }}
        contentFit="cover"
      />
      <View className="flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-base font-semibold text-stone-900">
            {item.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xóa ${item.name}`}
            hitSlop={8}
            onPress={() => remove(item.key)}
          >
            <Ionicons name="trash-outline" size={18} color="#a8a29e" />
          </Pressable>
        </View>
        {item.options.length ? (
          <Text className="text-sm text-stone-500">
            {item.options.map((o) => o.name).join(" · ")}
          </Text>
        ) : null}
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-semibold text-brand">
            {formatVnd(item.unitPrice * item.quantity)}
          </Text>
          <QuantityStepper
            size="sm"
            min={0}
            max={MAX_QUANTITY}
            value={item.quantity}
            onChange={(quantity) => setQuantity(item.key, quantity)}
          />
        </View>
      </View>
    </View>
  );
}
