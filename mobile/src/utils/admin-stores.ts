import type { OpeningHours, Store, StoreInput, Weekday } from '@/types/api';

/** Pure logic of the admin store form (app/admin/stores/[id].tsx). */

export const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Thứ 2' },
  { key: 'tue', label: 'Thứ 3' },
  { key: 'wed', label: 'Thứ 4' },
  { key: 'thu', label: 'Thứ 5' },
  { key: 'fri', label: 'Thứ 6' },
  { key: 'sat', label: 'Thứ 7' },
  { key: 'sun', label: 'Chủ nhật' },
];

const DEFAULT_OPEN = '07:00';
const DEFAULT_CLOSE = '22:00';

/** One day of the form. Times stay text while typing ("7:3" is fine until saving). */
export type DayDraft = { isOpen: boolean; open: string; close: string };

export type StoreDraft = {
  name: string;
  address: string;
  phone: string;
  /** Text fields: coordinates are typed or pasted from Google Maps. */
  latitude: string;
  longitude: string;
  isActive: boolean;
  hours: Record<Weekday, DayDraft>;
};

export function storeDraft(store?: Store): StoreDraft {
  const hours = {} as Record<Weekday, DayDraft>;
  for (const { key } of WEEKDAYS) {
    const day = store?.openingHours?.[key];
    // A day missing from the saved hours (or a new store) starts open 07:00–22:00.
    hours[key] =
      day === null
        ? { isOpen: false, open: DEFAULT_OPEN, close: DEFAULT_CLOSE }
        : { isOpen: true, open: day?.open ?? DEFAULT_OPEN, close: day?.close ?? DEFAULT_CLOSE };
  }
  return {
    name: store?.name ?? '',
    address: store?.address ?? '',
    phone: store?.phone ?? '',
    latitude: store ? String(store.latitude) : '',
    longitude: store ? String(store.longitude) : '',
    isActive: store?.isActive ?? true,
    hours,
  };
}

/** "0730" or "07:30" typed → "07:30". Keeps digits only and adds the colon. */
export function timeInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Accepts "10.7739" and "10,7739" (Vietnamese decimal comma). */
function parseCoordinate(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() && Number.isFinite(value) ? value : null;
}

export type StoreDraftErrors = Partial<
  Record<'name' | 'address' | 'phone' | 'latitude' | 'longitude' | 'hours', string>
>;

/** Same limits as the backend (stores/dto/store.dto.ts), plus sensible opening hours. */
export function storeDraftErrors(draft: StoreDraft): StoreDraftErrors {
  const errors: StoreDraftErrors = {};
  if (!draft.name.trim()) errors.name = 'Nhập tên cửa hàng';
  if (!draft.address.trim()) errors.address = 'Nhập địa chỉ';
  const phone = draft.phone.trim();
  if (phone && (phone.length < 6 || phone.length > 20)) errors.phone = 'Số điện thoại từ 6 đến 20 ký tự';
  const latitude = parseCoordinate(draft.latitude);
  if (latitude === null || Math.abs(latitude) > 90) errors.latitude = 'Vĩ độ từ -90 đến 90';
  const longitude = parseCoordinate(draft.longitude);
  if (longitude === null || Math.abs(longitude) > 180) errors.longitude = 'Kinh độ từ -180 đến 180';

  for (const { key, label } of WEEKDAYS) {
    const day = draft.hours[key];
    if (!day.isOpen) continue;
    if (!TIME.test(day.open) || !TIME.test(day.close)) {
      errors.hours = `${label}: nhập giờ dạng 07:30`;
      break;
    }
    // "HH:mm" strings compare like times.
    if (day.close <= day.open) {
      errors.hours = `${label}: giờ đóng cửa phải sau giờ mở cửa`;
      break;
    }
  }
  return errors;
}

/** Only call once storeDraftErrors(draft) is empty. */
export function toStoreInput(draft: StoreDraft): StoreInput {
  const openingHours: OpeningHours = {};
  for (const { key } of WEEKDAYS) {
    const day = draft.hours[key];
    openingHours[key] = day.isOpen ? { open: day.open, close: day.close } : null;
  }
  return {
    name: draft.name.trim(),
    address: draft.address.trim(),
    phone: draft.phone.trim() || null,
    latitude: parseCoordinate(draft.latitude)!,
    longitude: parseCoordinate(draft.longitude)!,
    isActive: draft.isActive,
    openingHours,
  };
}

/** "07:00–22:00 mỗi ngày", "Nghỉ", or "Thứ 2: 07:00–22:00 · ..." when days differ. */
export function openingHoursSummary(hours: OpeningHours | null): string {
  if (!hours) return 'Chưa có giờ mở cửa';
  const text = (day: OpeningHours[Weekday]) => (day ? `${day.open}–${day.close}` : 'nghỉ');
  const days = WEEKDAYS.map(({ key }) => text(hours[key]));
  if (days.every((day) => day === days[0])) {
    return days[0] === 'nghỉ' ? 'Nghỉ cả tuần' : `${days[0]} mỗi ngày`;
  }
  return WEEKDAYS.map(({ label }, i) => `${label}: ${days[i]}`).join(' · ');
}
