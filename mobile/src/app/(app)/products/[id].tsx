import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/ui/coming-soon';
import { MOCK_PRODUCTS } from '@/constants/mock-data';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = MOCK_PRODUCTS.find((p) => p.id === id);

  return (
    <>
      <Stack.Screen options={{ title: product?.name ?? 'Chi tiết món' }} />
      <ComingSoon
        title={product?.name ?? `Món ${id}`}
        description="Ảnh, chọn size / đường / topping từ GET /api/products/:id (bước 1 và 4)."
      >
        <Button
          title="Thêm vào giỏ"
          onPress={() => {
            router.back();
            router.push('/cart');
          }}
        />
      </ComingSoon>
    </>
  );
}
