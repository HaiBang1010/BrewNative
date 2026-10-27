import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import {
  chosenOptions,
  defaultSelection,
  groupError,
  isSelectionValid,
  toggleOption,
  unitPrice,
} from '@/utils/cart-pricing';
import { formatVnd } from '@/utils/format';
import { useProduct } from '@/hooks/queries';
import { MAX_QUANTITY, useCart } from '@/stores/cart';
import type { OptionGroup, ProductDetail } from '@/types/api';
import type { Selection } from '@/types/cart';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, error, isPending, refetch } = useProduct(id);

  if (isPending) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  // `key` resets the form state if the screen is reused for another product.
  return <ProductForm key={product.id} product={product} />;
}

function ProductForm({ product }: { product: ProductDetail }) {
  const insets = useSafeAreaInsets();
  const addToCart = useCart((state) => state.add);
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(product));
  const [quantity, setQuantity] = useState(1);

  const options = chosenOptions(product, selection);
  const price = unitPrice(product.basePrice, options);
  const canAdd = product.isAvailable && isSelectionValid(product, selection);

  function add() {
    addToCart({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice: price,
      options,
      quantity,
    });
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="pb-6">
        <Image
          source={product.imageUrl}
          style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: '#f5f5f4' }}
          contentFit="cover"
          transition={200}
        />
        <View className="gap-6 p-5">
          <View className="gap-2">
            <Text className="text-2xl font-bold text-stone-900">{product.name}</Text>
            {product.description ? (
              <Text className="text-base text-stone-600">{product.description}</Text>
            ) : null}
            <Text className="text-xl font-semibold text-brand">{formatVnd(product.basePrice)}</Text>
          </View>

          {product.optionGroups.map((group) => (
            <OptionGroupPicker
              key={group.id}
              group={group}
              selected={selection[group.id] ?? []}
              error={groupError(group, selection)}
              onToggle={(optionId) => setSelection((s) => toggleOption(s, group, optionId))}
            />
          ))}

          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-stone-900">Số lượng</Text>
            <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_QUANTITY} />
          </View>
        </View>
      </ScrollView>

      {/* Fixed at the bottom, above the home indicator. */}
      <View
        className="border-t border-stone-200 bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          title={
            product.isAvailable
              ? `Thêm vào giỏ · ${formatVnd(price * quantity)}`
              : 'Món này đang hết'
          }
          disabled={!canAdd}
          onPress={add}
        />
      </View>
    </>
  );
}

function OptionGroupPicker({
  group,
  selected,
  error,
  onToggle,
}: {
  group: OptionGroup;
  selected: string[];
  error: string | null;
  onToggle: (optionId: string) => void;
}) {
  const rule =
    group.minSelect === 0
      ? `Tùy chọn, tối đa ${group.maxSelect}`
      : group.minSelect === group.maxSelect
        ? `Bắt buộc, chọn ${group.minSelect}`
        : `Chọn ${group.minSelect}–${group.maxSelect}`;

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-base font-semibold text-stone-900">{group.name}</Text>
        <Text className={`text-sm ${error ? 'text-red-600' : 'text-stone-500'}`}>
          {error ?? rule}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {group.options.map((option) => (
          <Chip
            key={option.id}
            label={`${option.name}${option.priceDelta > 0 ? ` +${formatVnd(option.priceDelta)}` : ''}`}
            selected={selected.includes(option.id)}
            disabled={!option.isAvailable}
            onPress={() => onToggle(option.id)}
          />
        ))}
      </View>
    </View>
  );
}
