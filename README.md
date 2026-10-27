# Brew

App đặt đồ uống cho quán cà phê, dùng để học React Native + Expo từ cơ bản đến lúc đưa lên store.

## Cấu trúc repo

```
.
├── mobile/    # App React Native (Expo SDK 58, TypeScript)
├── backend/   # NestJS API + WebSocket + Stripe, PostgreSQL chạy bằng Docker
└── docs/      # Tài liệu của dự án
```

Mỗi thư mục là một dự án độc lập với `package.json` và `node_modules` riêng.
Cài package và chạy lệnh **bên trong thư mục tương ứng**, không chạy ở thư mục gốc.

## Chạy app mobile

```sh
cd mobile
npm install            # lần đầu
cp .env.example .env   # lần đầu, rồi sửa EXPO_PUBLIC_API_URL thành IP của Mac
npx expo start         # rồi bấm i (iOS Simulator) hoặc quét QR bằng Expo Go
```

Cần backend đang chạy (xem bên dưới). Khi chạy dev, màn đăng nhập điền sẵn tài khoản mẫu `customer@brew.local`.

App cần **development build** (không chạy trên Expo Go vì có MMKV, Google Sign-In): build một lần bằng
`npm run ios` / `npm run android`, sau đó mỗi ngày chỉ cần `npx expo start`. Sửa `app.json` hoặc cài thư viện có code
native thì chạy `npx expo prebuild --clean` rồi build lại.

Thử thanh toán: trong `backend/` chạy thêm `npm run stripe:listen` (để webhook của Stripe về được máy), dùng thẻ test
`4242 4242 4242 4242`, ngày hết hạn bất kỳ trong tương lai, CVC bất kỳ.

## Chạy backend

Xem [backend/README.md](backend/README.md).

Xem thêm trong [docs/](docs/README.md).
