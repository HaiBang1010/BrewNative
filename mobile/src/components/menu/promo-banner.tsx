import { Image } from 'expo-image';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

const BANNER = require('../../../assets/images/figma/promo-banner.png');

/** "Highlighter" line: a dark bar behind the lower part of the text, as in the design. */
function HighlightedLine({ children }: { children: string }) {
  return (
    <View className="self-start">
      <View className="absolute inset-x-0 bottom-0.5 h-[60%] bg-night-deep" />
      <Text className="px-0.5 text-[22px] font-semibold leading-7 text-white">{children}</Text>
    </View>
  );
}

/** Static promo card of the home screen. */
export function PromoBanner() {
  return (
    <View className="h-[140px] overflow-hidden rounded-2xl">
      <Image source={BANNER} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
      <View className="flex-1 justify-center gap-2 px-6">
        <View className="self-start rounded-lg bg-promo px-1.5 py-1">
          <Text className="text-sm font-semibold text-white">Mới</Text>
        </View>
        <View className="gap-0.5">
          <HighlightedLine>Đặt trước,</HighlightedLine>
          <HighlightedLine>khỏi xếp hàng</HighlightedLine>
        </View>
      </View>
    </View>
  );
}
