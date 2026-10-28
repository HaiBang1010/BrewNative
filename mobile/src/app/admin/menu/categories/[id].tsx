import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { FormScreen, FormSection } from '@/components/admin-menu/form-screen';
import { SORT_ORDER_MAX, StepperRow } from '@/components/admin-menu/stepper-row';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useAdminCategories, useAdminProducts, useDeleteCategory, useSaveCategory } from '@/hooks/admin-menu';
import { useDiscardGuard } from '@/hooks/discard-guard';
import type { CategorySummary } from '@/types/api';
import { errorMessage } from '@/utils/errors';

/** Admin: create a category (id "new") or rename / reorder / delete one. */
export default function AdminCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categories = useAdminCategories();

  if (categories.isPending) return <LoadingView />;
  if (categories.isError) return <ErrorView error={categories.error} onRetry={categories.refetch} />;

  const category = id === 'new' ? undefined : categories.data.find((c) => c.id === id);
  if (id !== 'new' && !category) return <ErrorView error={new Error('Danh mục này không còn nữa')} />;

  return (
    <>
      <Stack.Screen options={{ title: category ? 'Sửa danh mục' : 'Danh mục mới' }} />
      <CategoryForm
        category={category}
        // A new category goes last.
        nextSortOrder={Math.max(-1, ...categories.data.map((c) => c.sortOrder)) + 1}
      />
    </>
  );
}

function CategoryForm({ category, nextSortOrder }: { category?: CategorySummary; nextSortOrder: number }) {
  const [initial] = useState(() => ({
    name: category?.name ?? '',
    sortOrder: category?.sortOrder ?? nextSortOrder,
  }));
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const productCount = useAdminProducts().data?.filter((p) => p.categoryId === category?.id).length ?? 0;

  const dirty = draft.name !== initial.name || draft.sortOrder !== initial.sortOrder;
  const leave = useDiscardGuard(dirty);
  const nameError = !draft.name.trim()
    ? 'Nhập tên danh mục'
    : draft.name.trim().length > 100
      ? 'Tên tối đa 100 ký tự'
      : undefined;

  function submit() {
    setSubmitted(true);
    if (nameError) return;
    save.mutate(
      { id: category?.id ?? null, input: { name: draft.name.trim(), sortOrder: draft.sortOrder } },
      {
        onSuccess: () => leave(),
        onError: (error) => Alert.alert('Chưa lưu được', errorMessage(error)),
      },
    );
  }

  function confirmDelete() {
    if (!category) return;
    Alert.alert(`Xoá "${category.name}"?`, 'Danh mục sẽ biến mất khỏi menu.', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        // Close first: once deleted, this screen has nothing to show. A failure shows an alert.
        onPress: () =>
          leave(() => {
            remove.mutate(category.id);
            router.back();
          }),
      },
    ]);
  }

  return (
    <FormScreen
      footer={
        <>
          <Button title="Lưu" loading={save.isPending} onPress={submit} />
          {category ? (
            <Button
              title="Xoá danh mục"
              variant="outline"
              disabled={save.isPending || productCount > 0}
              onPress={confirmDelete}
            />
          ) : null}
        </>
      }
    >
      <FormSection>
        <TextField
          label="Tên danh mục"
          value={draft.name}
          onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
          placeholder="Ví dụ: Cà phê"
          maxLength={100}
          returnKeyType="done"
          onSubmitEditing={submit}
          error={submitted ? nameError : undefined}
        />
        <StepperRow
          label="Thứ tự hiển thị"
          hint="Số nhỏ hiện trước trong menu"
          value={draft.sortOrder}
          onChange={(sortOrder) => setDraft((d) => ({ ...d, sortOrder }))}
          min={0}
          max={SORT_ORDER_MAX}
        />
      </FormSection>
      {category && productCount > 0 ? (
        <Text className="px-1 text-xs text-ink-muted">
          Danh mục đang có {productCount} món. Muốn xoá danh mục thì chuyển các món sang danh mục khác
          hoặc xoá chúng trước.
        </Text>
      ) : null}
    </FormScreen>
  );
}
