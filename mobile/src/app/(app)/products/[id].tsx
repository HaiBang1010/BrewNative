import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { ErrorView } from '@/components/ui/screen-state';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import {
  chosenOptions,
  defaultSelection,
  groupError,
  isSelectionValid,
  toggleOption,
  unitPrice,
} from '@/utils/cart-pricing';
import { formatVnd, optionGroupRule } from '@/utils/format';
import { useProduct } from '@/hooks/queries';
import { MAX_QUANTITY, useCart } from '@/stores/cart';
import type { OptionGroup, ProductDetail } from '@/types/api';
import type { Selection } from '@/types/cart';

/** Up to this many options, a group is shown as equal-width boxes on one line (like S / M / L). */
const MAX_INLINE_OPTIONS = 3;

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, error, isPending, refetch } = useProduct(id);

  if (isPending) return <ProductSkeleton />;
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
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 px-6 pb-6 pt-2">
        <Image
          source={product.imageUrl}
          style={{ width: '100%', aspectRatio: 327 / 202, borderRadius: 16, backgroundColor: COLORS.imagePlaceholder }}
          contentFit="cover"
          transition={200}
        />

        <View className="gap-4">
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-xl font-semibold text-ink">{product.name}</Text>
              <Text className="text-xs text-ink-muted">
                {product.isAvailable ? formatVnd(product.basePrice) : 'Món này đang hết'}
              </Text>
            </View>
            <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_QUANTITY} />
          </View>
          <View className="mx-4 h-px bg-line" />
        </View>

        {product.description ? <Description text={product.description} /> : null}

        {product.optionGroups.map((group) => (
          <OptionGroupPicker
            key={group.id}
            group={group}
            selected={selection[group.id] ?? []}
            error={groupError(group, selection)}
            onToggle={(optionId) => setSelection((s) => toggleOption(s, group, optionId))}
          />
        ))}
      </ScrollView>

      {/* Fixed at the bottom, above the home indicator. */}
      <View
        className="flex-row items-center gap-8 rounded-t-2xl bg-white px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="gap-1">
          <Text className="text-sm text-ink-subtle">Giá</Text>
          <Text className="text-lg font-semibold text-brand">{formatVnd(price * quantity)}</Text>
        </View>
        <Button
          className="flex-1"
          title={product.isAvailable ? 'Thêm vào giỏ' : 'Đang hết'}
          disabled={!canAdd}
          onPress={add}
        />
      </View>
    </>
  );
}

/** Three lines, then "Xem thêm" to expand. */
function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  return (
    <View className="gap-2">
      <Text className="text-base font-semibold text-ink">Mô tả</Text>
      <Text
        className="text-sm font-light leading-[21px] text-ink-muted"
        numberOfLines={expanded ? undefined : 3}
        onTextLayout={(e) => !expanded && setTruncated(e.nativeEvent.lines.length >= 3)}
      >
        {text}
      </Text>
      {truncated ? (
        <Text className="text-sm font-semibold text-brand" onPress={() => setExpanded((v) => !v)}>
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </Text>
      ) : null}
    </View>
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
  const rule = optionGroupRule(group);
  const inline = group.options.length <= MAX_INLINE_OPTIONS;

  return (
    <View className="gap-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-base font-semibold text-ink">{group.name}</Text>
        <Text className={`text-xs ${error ? 'text-red-500' : 'text-ink-muted'}`}>{error ?? rule}</Text>
      </View>
      <View className={`flex-row gap-4 ${inline ? '' : 'flex-wrap'}`}>
        {group.options.map((option) => (
          <Chip
            key={option.id}
            className={inline ? 'flex-1' : 'min-w-[96px]'}
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

/** Image, name, description and one option group, like the loaded screen. */
function ProductSkeleton() {
  return (
    // Same inset as the loaded ScrollView: starts below the iOS 26+ floating header,
    // so nothing jumps when the product arrives.
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={false}
      contentContainerClassName="px-6 pt-2"
    >
      <SkeletonGroup className="gap-5">
        <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: 327 / 202 }} />
        <View className="flex-row items-end justify-between">
          <View className="gap-2">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </View>
          <Skeleton className="h-10 w-32 rounded-full" />
        </View>
        <View className="gap-2">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-5/6 rounded" />
        </View>
        <View className="gap-4">
          <Skeleton className="h-4 w-16 rounded" />
          <View className="flex-row gap-4">
            <Skeleton className="h-[41px] flex-1 rounded-xl" />
            <Skeleton className="h-[41px] flex-1 rounded-xl" />
            <Skeleton className="h-[41px] flex-1 rounded-xl" />
          </View>
        </View>
      </SkeletonGroup>
    </ScrollView>
  );
}
