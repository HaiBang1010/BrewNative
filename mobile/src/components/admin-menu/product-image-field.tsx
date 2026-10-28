import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/constants/theme';
import type { LocalImage } from '@/services/admin-menu.service';

/** Same limit as the backend (uploads/image-upload.ts). */
const MAX_BYTES = 5 * 1024 * 1024;

type ProductImageFieldProps = {
  /** The saved image. */
  imageUrl: string | null;
  /** Picked but not uploaded yet: shown instead of the saved one. */
  picked: LocalImage | null;
  onPick: (image: LocalImage) => void;
};

/** Square product photo; tapping it opens the photo library (no permission needed). */
export function ProductImageField({ imageUrl, picked, onPick }: ProductImageFieldProps) {
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Crop to a square, like the menu cards show it.
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
      Alert.alert('Ảnh quá lớn', 'Chọn ảnh nhỏ hơn 5 MB.');
      return;
    }
    onPick({ uri: asset.uri });
  }

  const source = picked?.uri ?? imageUrl;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={source ? 'Đổi ảnh món' : 'Chọn ảnh món'}
      onPress={pick}
      className="items-center gap-2 self-center active:opacity-80"
    >
      <View>
        {source ? (
          <Image
            source={source}
            style={{ width: 160, height: 160, borderRadius: 24, backgroundColor: COLORS.imagePlaceholder }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-40 w-40 items-center justify-center gap-2 rounded-3xl border border-dashed border-line bg-white">
            <Ionicons name="image-outline" size={32} color={COLORS.inkMuted} />
            <Text className="text-xs text-ink-muted">Thêm ảnh</Text>
          </View>
        )}
        {source ? (
          <View className="absolute -bottom-2 -right-2 h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-brand">
            <Ionicons name="camera" size={18} color={COLORS.white} />
          </View>
        ) : null}
      </View>
      {picked ? <Text className="text-xs text-brand">Ảnh mới, sẽ tải lên khi lưu</Text> : null}
    </Pressable>
  );
}
