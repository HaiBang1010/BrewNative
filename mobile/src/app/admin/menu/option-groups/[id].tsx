import { Ionicons } from '@react-native-vector-icons/ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { FormScreen, FormSection } from '@/components/admin-menu/form-screen';
import { OptionRow } from '@/components/admin-menu/option-row';
import { StepperRow } from '@/components/admin-menu/stepper-row';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { COLORS } from '@/constants/theme';
import {
  PartialSaveError,
  useAdminProduct,
  useDeleteOptionGroup,
  useSaveOptionGroup,
} from '@/hooks/admin-menu';
import { useDiscardGuard } from '@/hooks/discard-guard';
import type { OptionGroup, ProductDetail } from '@/types/api';
import {
  moveItem,
  newOptionDraft,
  optionGroupDraft,
  optionGroupDraftError,
  removeOption,
  type OptionDraft,
} from '@/utils/admin-menu';
import { errorMessage } from '@/utils/errors';
import { optionGroupRule } from '@/utils/format';

/**
 * Admin: one option group of a product (id "new" to add one), e.g. "Size" with
 * S / M +5.000₫ / L +10.000₫. The group and all its choices are saved together.
 */
export default function AdminOptionGroupScreen() {
  const { id, productId } = useLocalSearchParams<{ id: string; productId: string }>();
  const product = useAdminProduct(productId);

  if (product.isPending) return <LoadingView />;
  if (product.isError) return <ErrorView error={product.error} onRetry={product.refetch} />;

  const group = id === 'new' ? undefined : product.data.optionGroups.find((g) => g.id === id);
  if (id !== 'new' && !group) return <ErrorView error={new Error('Nhóm tuỳ chọn này không còn nữa')} />;

  return (
    <>
      <Stack.Screen options={{ title: group ? 'Sửa nhóm tuỳ chọn' : 'Nhóm tuỳ chọn mới' }} />
      <OptionGroupForm product={product.data} group={group} />
    </>
  );
}

function OptionGroupForm({ product, group }: { product: ProductDetail; group: OptionGroup | undefined }) {
  const [initial] = useState(() => optionGroupDraft(group));
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const save = useSaveOptionGroup();
  const remove = useDeleteOptionGroup();

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const leave = useDiscardGuard(dirty);
  const error = submitted ? optionGroupDraftError(draft) : null;

  function updateOption(key: string, changes: Partial<OptionDraft>) {
    setDraft((d) => ({
      ...d,
      options: d.options.map((option) => (option.key === key ? { ...option, ...changes } : option)),
    }));
  }

  function setMaxSelect(maxSelect: number) {
    setDraft((d) => ({ ...d, maxSelect, minSelect: Math.min(d.minSelect, maxSelect) }));
  }

  function submit() {
    setSubmitted(true);
    if (optionGroupDraftError(draft)) return;
    save.mutate(
      {
        productId: product.id,
        group,
        draft,
        // A new group goes under the existing ones.
        sortOrder: Math.max(-1, ...product.optionGroups.map((g) => g.sortOrder)) + 1,
      },
      {
        onSuccess: () => leave(),
        onError: (e) => {
          if (e instanceof PartialSaveError) {
            // The product screen shows what was saved; opening the group again shows it too.
            Alert.alert('Mới lưu được một phần', `${errorMessage(e.reason)}\n\nMở lại nhóm để kiểm tra và sửa tiếp.`);
            leave();
          } else {
            Alert.alert('Chưa lưu được', errorMessage(e));
          }
        },
      },
    );
  }

  function confirmDelete() {
    if (!group) return;
    Alert.alert(`Xoá nhóm "${group.name}"?`, 'Mọi lựa chọn trong nhóm cũng bị xoá.', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xoá nhóm',
        style: 'destructive',
        // Close first: once deleted, this screen has nothing to show. A failure shows an alert.
        onPress: () =>
          leave(() => {
            remove.mutate(group.id);
            router.back();
          }),
      },
    ]);
  }

  const count = draft.options.length;

  return (
    <FormScreen
      footer={
        <>
          {error ? <Text className="text-center text-sm text-red-500">{error}</Text> : null}
          <Button title="Lưu" loading={save.isPending} onPress={submit} />
          {group ? (
            <Button title="Xoá nhóm" variant="outline" disabled={save.isPending} onPress={confirmDelete} />
          ) : null}
        </>
      }
    >
      <Text className="px-1 text-xs text-ink-muted">Món: {product.name}</Text>

      <FormSection>
        <TextField
          label="Tên nhóm"
          value={draft.name}
          onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
          placeholder="Ví dụ: Size, Đường, Topping"
          maxLength={100}
          error={submitted && !draft.name.trim() ? 'Nhập tên nhóm' : undefined}
        />
      </FormSection>

      <FormSection title="Khách được chọn">
        <StepperRow
          label="Ít nhất"
          hint="0 = không bắt buộc"
          value={draft.minSelect}
          onChange={(minSelect) => setDraft((d) => ({ ...d, minSelect }))}
          min={0}
          max={draft.maxSelect}
        />
        <StepperRow
          label="Nhiều nhất"
          hint="1 = chỉ chọn một, như Size"
          value={draft.maxSelect}
          onChange={setMaxSelect}
          min={1}
          max={Math.max(1, count)}
        />
        <View className="rounded-xl bg-brand-50 px-4 py-3">
          <Text className="text-xs text-brand-700">Khách sẽ thấy: {optionGroupRule(draft)}</Text>
        </View>
      </FormSection>

      <FormSection title={`Lựa chọn (${count})`}>
        <Text className="text-xs text-ink-muted">Giá cộng thêm vào giá món. Để 0 nếu không đổi giá.</Text>
        {draft.options.map((option, index) => (
          <OptionRow
            key={option.key}
            option={option}
            showErrors={submitted}
            onChange={(changes) => updateOption(option.key, changes)}
            onMoveUp={
              index > 0
                ? () => setDraft((d) => ({ ...d, options: moveItem(d.options, index, index - 1) }))
                : undefined
            }
            onMoveDown={
              index < count - 1
                ? () => setDraft((d) => ({ ...d, options: moveItem(d.options, index, index + 1) }))
                : undefined
            }
            onRemove={() => setDraft((d) => removeOption(d, option.key))}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => setDraft((d) => ({ ...d, options: [...d.options, newOptionDraft()] }))}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-brand-200 py-3 active:bg-brand-50"
        >
          <Ionicons name="add" size={18} color={COLORS.brand} />
          <Text className="text-sm font-semibold text-brand">Thêm lựa chọn</Text>
        </Pressable>
      </FormSection>
    </FormScreen>
  );
}
