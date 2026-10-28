import { Ionicons } from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { COLORS } from "@/constants/theme";
import { errorMessage } from "@/utils/errors";
import { formatVnd } from "@/utils/format";
import { useCartCheck } from "@/hooks/cart-check";
import { usePayOrder } from "@/hooks/payments";
import { useCancelOrder, useCreateOrder, useStores } from "@/hooks/queries";
import { usePush } from "@/lib/push-provider";
import { MAX_QUANTITY, useCart, useCartTotal } from "@/stores/cart";
import type { CartItem, CartLineCheck, PriceChange } from "@/types/cart";

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { items, storeId, note, setStoreId, setNote, clear } = useCart();
  const total = useCartTotal();
  const { data: stores } = useStores();
  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();
  const payOrder = usePayOrder();
  const cartCheck = useCartCheck();
  const push = usePush();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once paid: the cart is emptied while the order screen slides in over this one.
  const [paid, setPaid] = useState(false);

  // Pick the first store if none is chosen yet (or the saved one was closed).
  useEffect(() => {
    if (stores?.length && !stores.some((s) => s.id === storeId))
      setStoreId(stores[0].id);
  }, [stores, storeId, setStoreId]);

  // Without this, "Giỏ hàng đang trống" would show during that transition.
  if (paid) return <PaidView />;

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-50">
          <Ionicons name="bag-handle-outline" size={36} color={COLORS.brand} />
        </View>
        <Text className="text-base font-semibold text-ink">
          Giỏ hàng đang trống
        </Text>
        <Link href="/menu" asChild>
          <Button title="Xem menu" className="self-stretch" />
        </Link>
      </View>
    );
  }

  const store = stores?.find((s) => s.id === storeId);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

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

      // Last guard: the server priced the order with the current menu. If the items don't
      // cost what the customer saw, don't charge them: reload the prices and let them check.
      // (subtotal = items only, like the cart; total may later add fees or discounts.)
      if (order.subtotal !== total) {
        cancelOrder.mutate(order.id);
        await cartCheck.refetch();
        setError(
          "Giá vừa thay đổi và giỏ hàng đã được cập nhật. Kiểm tra lại rồi bấm Thanh toán.",
        );
        return;
      }

      const result = await payOrder(order.id);
      if (result.outcome === "cancelled") {
        cancelOrder.mutate(order.id);
        return;
      }
      // Paid: now it is a real order. `replace` so Back doesn't return to the cart.
      setPaid(true);
      clear();
      // Now is when "we'll tell you when it's ready" makes sense: ask for notifications.
      void push.enable();
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
    <View className="flex-1">
      {/* Typing the note scrolls it above the keyboard. */}
      <KeyboardAwareScrollView
        bottomOffset={16}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-5 pb-6 pt-2"
        keyboardShouldPersistTaps="handled"
      >
        {/* Brew is pick-up only: this is where the design has the delivery address. */}
        <View className="gap-4 px-6">
          <Text className="text-base font-semibold text-ink">Nhận tại quán</Text>
          <View className="gap-1">
            <Text className="text-sm font-semibold text-ink-soft">
              {store?.name ?? "Đang tải cửa hàng…"}
            </Text>
            {store ? (
              <Text className="text-xs text-ink-muted">{store.address}</Text>
            ) : null}
          </View>
          {stores && stores.length > 1 ? (
            <View className="flex-row flex-wrap gap-2">
              {stores.map((s) => (
                <Pill
                  key={s.id}
                  icon="storefront-outline"
                  label={s.name}
                  selected={s.id === storeId}
                  onPress={() => setStoreId(s.id)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View className="mx-10 h-px bg-line" />

        <View className="gap-4 px-6">
          {cartCheck.priceChanges.length ? (
            <PriceChangeNotice
              changes={cartCheck.priceChanges}
              onDismiss={cartCheck.dismissPriceChanges}
            />
          ) : null}
          {items.map((item) => (
            <CartRow
              key={item.key}
              item={item}
              check={cartCheck.checks.get(item.key)}
            />
          ))}
        </View>

        <View className="h-1 bg-brand-50" />

        <View className="px-6">
          <TextField
            label="Ghi chú cho quán"
            value={note}
            onChangeText={setNote}
            placeholder="Ví dụ: ít đá"
            maxLength={500}
          />
        </View>

        <View className="gap-4 px-6">
          <Text className="text-base font-semibold text-ink">
            Tóm tắt thanh toán
          </Text>
          <View className="gap-2">
            <SummaryRow label={`Giá món (${count})`} value={formatVnd(total)} />
            <SummaryRow label="Tổng cộng" value={formatVnd(total)} strong />
          </View>
        </View>
      </KeyboardAwareScrollView>

      <View
        className="gap-3 rounded-t-2xl bg-white px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row items-center gap-4">
          <Ionicons name="card-outline" size={20} color={COLORS.brand} />
          <View className="flex-1 gap-1">
            {/* Card only: Apple Pay / Google Pay aren't set up in PaymentSheet. */}
            <Text className="text-sm font-semibold text-ink">
              Thẻ ngân hàng
            </Text>
            <Text className="text-xs font-semibold text-brand">
              {formatVnd(total)}
            </Text>
          </View>
        </View>
        {error ? (
          <Text className="text-center text-sm text-red-500">{error}</Text>
        ) : cartCheck.blockedCount > 0 ? (
          <Text className="text-center text-sm text-red-500">
            Xóa món không đặt được để thanh toán
          </Text>
        ) : null}
        <Button
          title={cartCheck.isChecking ? "Đang kiểm tra giá…" : "Thanh toán"}
          loading={checkingOut}
          disabled={
            !storeId || cartCheck.isChecking || cartCheck.blockedCount > 0
          }
          onPress={checkout}
        />
      </View>
    </View>
  );
}

/** Outlined pill button, like "Edit Address" / "Add Note" in the design. */
function Pill({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center gap-1 rounded-2xl border px-3 py-1.5 ${
        selected ? "border-brand bg-brand-50" : "border-ink-muted bg-white active:bg-surface"
      }`}
    >
      <Ionicons
        name={icon}
        size={14}
        color={selected ? COLORS.brand : COLORS.inkSoft}
      />
      <Text className={`text-xs ${selected ? "text-brand" : "text-ink-soft"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-ink-soft">{label}</Text>
      <Text
        className={`text-ink ${strong ? "text-base font-bold" : "text-sm font-semibold"}`}
      >
        {value}
      </Text>
    </View>
  );
}

/** Prices that changed since the items were added; the cart now shows the new ones. */
function PriceChangeNotice({
  changes,
  onDismiss,
}: {
  changes: PriceChange[];
  onDismiss: () => void;
}) {
  return (
    <View className="flex-row gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <Ionicons name="pricetag-outline" size={18} color={COLORS.brand} />
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-ink">
          Giá đã được cập nhật theo menu mới
        </Text>
        {changes.map((change, i) => (
          <Text key={i} className="text-xs text-ink-soft">
            {change.name}: {formatVnd(change.from)} → {formatVnd(change.to)}
          </Text>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng thông báo"
        hitSlop={8}
        onPress={onDismiss}
      >
        <Ionicons name="close" size={18} color={COLORS.inkMuted} />
      </Pressable>
    </View>
  );
}

function CartRow({
  item,
  check,
}: {
  item: CartItem;
  /** Missing while the product loads. */
  check: CartLineCheck | undefined;
}) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const blocked = check?.ok === false;

  return (
    <View className="flex-row items-center gap-4">
      <Image
        source={item.imageUrl}
        style={{
          width: 54,
          height: 54,
          borderRadius: 8,
          backgroundColor: COLORS.imagePlaceholder,
          opacity: blocked ? 0.4 : 1,
        }}
        contentFit="cover"
      />
      <View className="flex-1 gap-1">
        <Text
          className={`text-base font-semibold ${blocked ? "text-ink-muted" : "text-ink"}`}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.options.length ? (
          <Text className="text-xs text-ink-muted" numberOfLines={1}>
            {item.options.map((o) => o.name).join(" · ")}
          </Text>
        ) : null}
        {blocked ? (
          <View className="self-start rounded-md bg-red-50 px-2 py-0.5">
            <Text className="text-xs font-semibold text-red-500">
              {check.reason}
            </Text>
          </View>
        ) : (
          <Text className="text-xs font-semibold text-brand">
            {formatVnd(item.unitPrice * item.quantity)}
          </Text>
        )}
      </View>
      {blocked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xóa ${item.name}`}
          onPress={() => remove(item.key)}
          className="rounded-2xl border border-ink-muted px-3 py-1.5 active:bg-surface"
        >
          <Text className="text-xs text-ink-soft">Xóa</Text>
        </Pressable>
      ) : (
        // Going below 1 removes the line.
        <QuantityStepper
          size="sm"
          min={0}
          max={MAX_QUANTITY}
          value={item.quantity}
          onChange={(quantity) => setQuantity(item.key, quantity)}
        />
      )}
    </View>
  );
}

/** Shown for the moment between paying and the order screen. */
function PaidView() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-success">
        <Ionicons name="checkmark" size={40} color={COLORS.white} />
      </View>
      <Text className="text-base font-semibold text-ink">Thanh toán thành công</Text>
      <View className="flex-row items-center gap-2">
        <ActivityIndicator size="small" color={COLORS.inkMuted} />
        <Text className="text-sm text-ink-muted">Đang mở đơn hàng…</Text>
      </View>
    </View>
  );
}
