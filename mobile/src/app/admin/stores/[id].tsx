import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { FormScreen, FormSection } from '@/components/admin-menu/form-screen';
import { Button } from '@/components/ui/button';
import { ErrorView, LoadingView } from '@/components/ui/screen-state';
import { BrandSwitch, SwitchRow } from '@/components/ui/switch-row';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { COLORS } from '@/constants/theme';
import { useAdminStores, useSaveStore } from '@/hooks/admin-shop';
import { useDiscardGuard } from '@/hooks/discard-guard';
import type { Store, Weekday } from '@/types/api';
import {
  WEEKDAYS,
  storeDraft,
  storeDraftErrors,
  timeInput,
  toStoreInput,
  type DayDraft,
} from '@/utils/admin-stores';
import { errorMessage } from '@/utils/errors';

/**
 * Admin: add a store (id "new") or edit one. Stores are never deleted (orders
 * point to them): "Đang bán" off closes it for customers.
 */
export default function AdminStoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stores = useAdminStores();

  if (stores.isPending) return <LoadingView />;
  if (stores.isError) return <ErrorView error={stores.error} onRetry={stores.refetch} />;

  const store = id === 'new' ? undefined : stores.data.find((s) => s.id === id);
  if (id !== 'new' && !store) return <ErrorView error={new Error('Cửa hàng này không còn nữa')} />;

  return (
    <>
      <Stack.Screen options={{ title: store ? 'Sửa cửa hàng' : 'Cửa hàng mới' }} />
      <StoreForm store={store} />
    </>
  );
}

function StoreForm({ store }: { store: Store | undefined }) {
  const [initial] = useState(() => storeDraft(store));
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const save = useSaveStore();

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const leave = useDiscardGuard(dirty);
  const errors = submitted ? storeDraftErrors(draft) : {};
  const update = (changes: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...changes }));
  const updateDay = (day: Weekday, changes: Partial<DayDraft>) =>
    setDraft((d) => ({ ...d, hours: { ...d.hours, [day]: { ...d.hours[day], ...changes } } }));

  function copyMondayToAllDays() {
    setDraft((d) => {
      const hours = { ...d.hours };
      for (const { key } of WEEKDAYS) hours[key] = { ...d.hours.mon };
      return { ...d, hours };
    });
  }

  function submit() {
    setSubmitted(true);
    if (Object.keys(storeDraftErrors(draft)).length) return;
    save.mutate(
      { id: store?.id ?? null, input: toStoreInput(draft) },
      {
        onSuccess: () => leave(),
        onError: (error) => Alert.alert('Chưa lưu được', errorMessage(error)),
      },
    );
  }

  return (
    <FormScreen
      footer={
        <>
          {errors.hours ? <Text className="text-center text-sm text-red-500">{errors.hours}</Text> : null}
          <Button title="Lưu" loading={save.isPending} onPress={submit} />
        </>
      }
    >
      <FormSection>
        <SwitchRow
          label="Đang bán"
          description="Tắt khi tạm đóng cửa: khách không chọn được quán này khi đặt món."
          value={draft.isActive}
          onChange={(isActive) => update({ isActive })}
        />
      </FormSection>

      <FormSection title="Thông tin">
        <TextField
          label="Tên cửa hàng"
          value={draft.name}
          onChangeText={(name) => update({ name })}
          placeholder="Ví dụ: Brew Nguyễn Huệ"
          maxLength={100}
          error={errors.name}
        />
        <TextField
          label="Địa chỉ"
          value={draft.address}
          onChangeText={(address) => update({ address })}
          placeholder="Số nhà, đường, phường, quận"
          maxLength={255}
          error={errors.address}
        />
        <TextField
          label="Số điện thoại"
          value={draft.phone}
          onChangeText={(phone) => update({ phone })}
          placeholder="Không bắt buộc"
          keyboardType="phone-pad"
          maxLength={20}
          error={errors.phone}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TextField
              label="Vĩ độ"
              value={draft.latitude}
              onChangeText={(latitude) => update({ latitude })}
              placeholder="10.7739"
              keyboardType="numbers-and-punctuation"
              error={errors.latitude}
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Kinh độ"
              value={draft.longitude}
              onChangeText={(longitude) => update({ longitude })}
              placeholder="106.7036"
              keyboardType="numbers-and-punctuation"
              error={errors.longitude}
            />
          </View>
        </View>
        <Text className="text-xs text-ink-muted">
          Lấy toạ độ trên Google Maps: nhấn giữ vào vị trí quán, toạ độ hiện ở ô tìm kiếm.
        </Text>
      </FormSection>

      <FormSection
        title="Giờ mở cửa"
        action={
          <Pressable accessibilityRole="button" hitSlop={8} onPress={copyMondayToAllDays} className="active:opacity-60">
            <Text className="text-sm font-semibold text-brand">Như Thứ 2 cả tuần</Text>
          </Pressable>
        }
      >
        {WEEKDAYS.map(({ key, label }) => (
          <DayRow key={key} label={label} day={draft.hours[key]} onChange={(changes) => updateDay(key, changes)} />
        ))}
      </FormSection>
    </FormScreen>
  );
}

const TIME_INPUT = 'h-10 w-[68px] rounded-lg border border-line bg-white text-center font-app text-sm text-ink';

function DayRow({
  label,
  day,
  onChange,
}: {
  label: string;
  day: DayDraft;
  onChange: (changes: Partial<DayDraft>) => void;
}) {
  return (
    <View className="min-h-10 flex-row items-center gap-3">
      <BrandSwitch value={day.isOpen} onChange={(isOpen) => onChange({ isOpen })} accessibilityLabel={`${label}: mở cửa`} />
      <Text className="w-[72px] text-sm text-ink">{label}</Text>
      {day.isOpen ? (
        <View className="flex-1 flex-row items-center justify-end gap-2">
          <TextInput
            value={day.open}
            onChangeText={(text) => onChange({ open: timeInput(text) })}
            placeholder="07:00"
            placeholderTextColor={COLORS.inkMuted}
            keyboardType="number-pad"
            maxLength={5}
            accessibilityLabel={`${label}: giờ mở cửa`}
            className={TIME_INPUT}
          />
          <Text className="text-ink-muted">–</Text>
          <TextInput
            value={day.close}
            onChangeText={(text) => onChange({ close: timeInput(text) })}
            placeholder="22:00"
            placeholderTextColor={COLORS.inkMuted}
            keyboardType="number-pad"
            maxLength={5}
            accessibilityLabel={`${label}: giờ đóng cửa`}
            className={TIME_INPUT}
          />
        </View>
      ) : (
        <Text className="flex-1 text-right text-sm text-ink-muted">Nghỉ</Text>
      )}
    </View>
  );
}
