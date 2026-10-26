# Tổng quan dự án

**Brew** là app đặt đồ uống/đồ ăn cho quán cà phê. Người dùng xem menu, đặt món, thanh toán bằng Stripe,
theo dõi trạng thái đơn theo thời gian thực và chat với quán.

Bán hàng vật lý (đồ uống) nên được phép dùng Stripe. Hàng số (gói premium, nội dung số) thì Apple/Google
bắt buộc dùng In-App Purchase.

## Tính năng và kiến thức

| Tính năng | Kiến thức |
|---|---|
| Đăng nhập, đăng ký | Auth, Sign in with Apple/Google, `expo-secure-store`, route được bảo vệ |
| Tab Home / Menu / Đơn hàng / Hồ sơ | Expo Router: tabs, stack, modal, deep link |
| Danh sách menu, tìm kiếm, lọc | `FlatList`/`FlashList`, infinite scroll, pull to refresh, `ScrollView` ngang |
| Ảnh món | `expo-image` |
| Chi tiết món, chọn size/topping | Form, Reanimated, bottom sheet |
| Giỏ hàng | Zustand, MMKV |
| Thanh toán | `@stripe/stripe-react-native`, PaymentSheet, Apple Pay, Google Pay |
| Theo dõi đơn realtime | WebSocket, tự kết nối lại, xử lý khi app chuyển nền |
| Chat với quán (khách ↔ admin) | WebSocket, xử lý bàn phím, đếm tin chưa đọc |
| Thông báo đơn sẵn sàng | `expo-notifications` |
| Bản đồ chi nhánh | `expo-location`, `react-native-maps`, xin quyền |
| Ảnh đại diện | `expo-image-picker`, upload file |
| Dark mode, đa ngôn ngữ | NativeWind, i18n |
| Gọi API | TanStack Query |
| Phát hành | EAS Build, EAS Submit, EAS Update |

## Backend

Stripe cần server để tạo PaymentIntent (secret key không được nằm trong app), WebSocket cũng cần server.
NestJS + TypeORM + PostgreSQL (chạy bằng Docker), WebSocket qua NestJS Gateway (Socket.IO).
Xem [../backend/README.md](../backend/README.md) và [data-model-and-flow.md](data-model-and-flow.md).

## Lộ trình

1. **Nền tảng**: Expo Router, NativeWind, màn hình tĩnh, list và ảnh với dữ liệu giả.
2. **Backend và auth**: API, đăng nhập, lưu token, route được bảo vệ.
3. **Giỏ hàng và Stripe**: PaymentSheet, webhook xác nhận thanh toán.
4. **Realtime**: WebSocket cho trạng thái đơn và chat, push notification.
5. **Hoàn thiện**: bản đồ, camera, animation, dark mode, xử lý lỗi, test.
6. **Phát hành**: EAS Build, TestFlight / Internal testing, nộp store.

## Lưu ý

- Stripe, Maps, Sign in with Apple **không chạy trên Expo Go**. Từ bước 3 phải dùng development build
  (`npx expo run:ios` / `npx expo run:android` hoặc EAS Build), cần Xcode, Android Studio và JDK 17 (Zulu).
- Expo Go trên store chỉ hỗ trợ SDK mới nhất.
- Phí: Apple Developer 99 USD/năm, Google Play 25 USD một lần.
