import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { FormScreen, FormSection } from '@/components/admin-menu/form-screen';
import { ProductImageField } from '@/components/admin-menu/product-image-field';
import { SORT_ORDER_MAX, StepperRow } from '@/components/admin-menu/stepper-row';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PriceField } from '@/components/ui/price-field';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { SwitchRow } from '@/components/ui/switch-row';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { COLORS } from '@/constants/theme';
import { useAdminCategories, useAdminProduct, useDeleteProduct, useSaveProduct } from '@/hooks/admin-menu';
import { useDiscardGuard } from '@/hooks/discard-guard';
import type { LocalImage } from '@/services/admin-menu.service';
import type { CategorySummary, OptionGroup, ProductDetail } from '@/types/api';
import { productDraft, productDraftErrors, toProductInput } from '@/utils/admin-menu';
import { errorMessage } from '@/utils/errors';
import { formatVnd, optionGroupRule } from '@/utils/format';

/**
 * Admin: create a product (id "new", optionally with ?categoryId=) or edit one.
 * Option groups (size, sugar...) belong to a saved product, so they appear after the first save.
 */
export default function AdminProductScreen() {
  const { id, categoryId } = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const productId = id === 'new' ? null : id;
  const product = useAdminProduct(productId);
  const categories = useAdminCategories();

  if ((productId && product.isPending) || categories.isPending) return <LoadingView />;
  if (product.isError) return <ErrorView error={product.error} onRetry={product.refetch} />;
  if (categories.isError) return <ErrorView error={categories.error} onRetry={categories.refetch} />;

  return (
    <>
      <Stack.Screen options={{ title: productId ? 'Sửa món' : 'Món mới' }} />
      <ProductForm product={product.data} categories={categories.data} defaultCategoryId={categoryId} />
    </>
  );
}

function ProductForm({
  product,
  categories,
  defaultCategoryId,
}: {
  product: ProductDetail | undefined;
  categories: CategorySummary[];
  defaultCategoryId?: string;
}) {
  const [initial] = useState(() => productDraft(product, defaultCategoryId ?? categories[0]?.id));
  const [draft, setDraft] = useState(initial);
  const [image, setImage] = useState<LocalImage | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const save = useSaveProduct();
  const remove = useDeleteProduct();

  const dirty = image !== null || JSON.stringify(draft) !== JSON.stringify(initial);
  const leave = useDiscardGuard(dirty);
  // Shown once the admin has tried to save, not while they are still typing.
  const errors = submitted ? productDraftErrors(draft) : {};
  const update = (changes: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...changes }));

  function submit() {
    setSubmitted(true);
    if (Object.keys(productDraftErrors(draft)).length) return;
    save.mutate(
      { id: product?.id ?? null, input: toProductInput(draft), image },
      {
        onSuccess: ({ product: saved, imageError }) => {
          if (imageError) {
            Alert.alert('Đã lưu món, nhưng chưa tải được ảnh', errorMessage(imageError));
            // Stay, with the photo still picked, so saving again retries the upload.
            if (product) return;
          }
          if (product) return leave();
          // New product: continue on its edit screen, where option groups can be added.
          leave(() => router.replace({ pathname: '/admin/menu/products/[id]', params: { id: saved.id } }));
        },
        onError: (error) => Alert.alert('Chưa lưu được', errorMessage(error)),
      },
    );
  }

  function confirmDelete() {
    if (!product) return;
    Alert.alert(
      `Xoá "${product.name}"?`,
      'Món biến mất khỏi menu. Đơn cũ vẫn giữ tên và giá đã bán. Nếu chỉ tạm hết, hãy tắt "Còn hàng".',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Xoá món',
          style: 'destructive',
          // Close first: once deleted, this screen has nothing to show. A failure shows an alert.
          onPress: () =>
            leave(() => {
              remove.mutate(product.id);
              router.back();
            }),
        },
      ],
    );
  }

  return (
    <FormScreen
      footer={
        <>
          <Button title="Lưu" loading={save.isPending} onPress={submit} />
          {product ? (
            <Button title="Xoá món" variant="outline" disabled={save.isPending} onPress={confirmDelete} />
          ) : null}
        </>
      }
    >
      <ProductImageField imageUrl={product?.imageUrl ?? null} picked={image} onPick={setImage} />

      <FormSection title="Thông tin">
        <TextField
          label="Tên món"
          value={draft.name}
          onChangeText={(name) => update({ name })}
          placeholder="Ví dụ: Cà phê sữa đá"
          maxLength={150}
          error={errors.name}
        />
        <TextField
          label="Mô tả"
          value={draft.description}
          onChangeText={(description) => update({ description })}
          placeholder="Vài dòng giới thiệu món (không bắt buộc)"
          maxLength={2000}
          multiline
        />
        <PriceField
          label="Giá (₫)"
          placeholder="Ví dụ: 35.000"
          value={draft.basePrice}
          onChange={(basePrice) => update({ basePrice })}
          hint="Giá của lựa chọn rẻ nhất. Size lớn hơn, topping... cộng thêm trong phần Tuỳ chọn."
          error={errors.basePrice}
        />
      </FormSection>

      <FormSection title="Danh mục">
        <View className="flex-row flex-wrap gap-2">
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={draft.categoryId === category.id}
              onPress={() => update({ categoryId: category.id })}
            />
          ))}
        </View>
        {errors.categoryId ? <Text className="text-sm text-red-500">{errors.categoryId}</Text> : null}
      </FormSection>

      <FormSection>
        <SwitchRow
          label="Còn hàng"
          description="Tắt khi tạm hết: khách vẫn thấy món nhưng không đặt được."
          value={draft.isAvailable}
          onChange={(isAvailable) => update({ isAvailable })}
        />
        <StepperRow
          label="Thứ tự hiển thị"
          hint="Số nhỏ hiện trước trong danh mục"
          value={draft.sortOrder}
          onChange={(sortOrder) => update({ sortOrder })}
          min={0}
          max={SORT_ORDER_MAX}
        />
      </FormSection>

      {product ? (
        <OptionGroupsSection productId={product.id} groups={product.optionGroups} />
      ) : (
        <FormSection title="Tuỳ chọn">
          <Text className="text-sm text-ink-muted">
            Lưu món trước, rồi thêm các nhóm tuỳ chọn như Size, Đường, Topping.
          </Text>
        </FormSection>
      )}
    </FormScreen>
  );
}

/** The product's option groups; each opens its own form. */
function OptionGroupsSection({ productId, groups }: { productId: string; groups: OptionGroup[] }) {
  return (
    <FormSection
      title="Tuỳ chọn"
      action={
        <Link
          href={{ pathname: '/admin/menu/option-groups/[id]', params: { id: 'new', productId } }}
          asChild
        >
          <Pressable accessibilityRole="button" hitSlop={8} className="flex-row items-center gap-1 active:opacity-60">
            <Ionicons name="add" size={16} color={COLORS.brand} />
            <Text className="text-sm font-semibold text-brand">Thêm nhóm</Text>
          </Pressable>
        </Link>
      }
    >
      {groups.length ? (
        groups.map((group) => (
          <Link
            key={group.id}
            href={{ pathname: '/admin/menu/option-groups/[id]', params: { id: group.id, productId } }}
            asChild
          >
            <Pressable className="flex-row items-center gap-3 rounded-xl border border-line px-4 py-3 active:bg-surface">
              <View className="flex-1 gap-1">
                <View className="flex-row items-baseline justify-between gap-2">
                  <Text className="text-sm font-semibold text-ink">{group.name}</Text>
                  <Text className="text-xs text-ink-muted">{optionGroupRule(group)}</Text>
                </View>
                <Text className="text-xs text-ink-soft" numberOfLines={2}>
                  {group.options
                    .map(
                      (option) =>
                        `${option.name}${option.priceDelta ? ` +${formatVnd(option.priceDelta)}` : ''}${option.isAvailable ? '' : ' (hết)'}`,
                    )
                    .join(' · ') || 'Chưa có lựa chọn'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.inkMuted} />
            </Pressable>
          </Link>
        ))
      ) : (
        <Text className="text-sm text-ink-muted">
          Món chưa có tuỳ chọn: khách đặt luôn với giá trên.
        </Text>
      )}
    </FormSection>
  );
}
