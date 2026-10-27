# Tổ chức thư mục

## Thư mục gốc

```
.
├── mobile/      # App Expo
├── backend/     # Server
├── docs/        # Tài liệu
├── AGENTS.md    # Hướng dẫn cho AI agent
├── CLAUDE.md
└── README.md
```

`mobile/` và `backend/` là hai dự án **độc lập**: mỗi bên có `package.json`, `node_modules`, `tsconfig.json` riêng.
Không dùng npm workspaces (monorepo) để giữ cấu hình đơn giản. Khi nào cần chia sẻ code (ví dụ type của API)
giữa hai bên thì mới cân nhắc chuyển sang monorepo theo
[hướng dẫn của Expo](https://docs.expo.dev/guides/monorepos/).

## mobile/

Expo SDK 58 + **Expo Router** (routing theo file) + **NativeWind 4** (Tailwind CSS 3 cho React Native).

```
mobile/
├── src/
│   ├── app/                    # Mỗi file là một màn hình (route). Xem bảng bên dưới
│   ├── components/
│   │   ├── ui/                 # Button, TextField, Chip, QuantityStepper, LoadingView...
│   │   └── cart-button.tsx     # Icon giỏ hàng có badge (header màn Menu)
│   ├── hooks/                  # Hook React: thêm cache (TanStack Query) cho services/
│   │   ├── queries.ts          # useMe, useMenu, useOrders... và useCreateOrder, useCancelOrder
│   │   └── payments.ts         # usePayOrder (Stripe PaymentSheet), useConfirmPayment
│   ├── services/               # Gọi ra bên ngoài: backend, keychain, Google
│   │   ├── api-client.ts       # fetch + token + tự refresh khi 401 (1 lần refresh cùng lúc)
│   │   ├── session.ts          # Client API dùng chung + lưu token vào keychain (expo-secure-store)
│   │   ├── auth.service.ts     # /auth: login, register, Google, logout
│   │   ├── user.service.ts     # /me
│   │   ├── menu.service.ts     # /menu, /products, /stores
│   │   ├── order.service.ts    # /orders và thanh toán
│   │   └── google-sign-in.ts   # SDK Google Sign-In
│   ├── lib/                    # Cấu hình thư viện và provider dùng cho cả app
│   │   ├── app-providers.tsx   # Gom mọi provider; app/_layout.tsx chỉ dùng cái này
│   │   ├── auth-provider.tsx   # AuthProvider / useAuth: trạng thái đăng nhập
│   │   ├── query-client.ts     # Cấu hình TanStack Query
│   │   ├── query-keys.ts       # Khóa cache dùng chung
│   │   └── stripe.ts           # Publishable key, URL quay lại app của Stripe
│   ├── stores/
│   │   └── cart.ts             # Giỏ hàng: Zustand, lưu xuống máy bằng MMKV
│   ├── types/                  # Chỉ kiểu dữ liệu, không có code chạy
│   │   ├── api.ts              # Dữ liệu backend trả về và body gửi lên
│   │   ├── auth.ts             # Tokens, TokenStore
│   │   ├── cart.ts             # CartItem, ChosenOption, Selection
│   │   └── payment.ts          # ConfirmResult, PayResult
│   ├── utils/                  # Hàm thuần: không React, không gọi mạng
│   │   ├── api-error.ts        # Lớp ApiError
│   │   ├── errors.ts           # Đổi lỗi thành câu tiếng Việt
│   │   ├── format.ts           # Tiền VND, ngày giờ, tên trạng thái đơn
│   │   └── cart-pricing.ts     # Chọn tùy chọn món, kiểm tra min/max, tính giá
│   ├── constants/              # Hằng số
│   └── global.css              # Tailwind; import một lần ở app/_layout.tsx
├── assets/                     # Icon, splash, font, ảnh tĩnh
├── app.json                    # Cấu hình Expo: tên, bundle id, scheme "brew", plugin
├── babel.config.js             # NativeWind (biến className thành style)
├── metro.config.js             # NativeWind đọc src/global.css
├── tailwind.config.js          # Màu brand, đường dẫn file dùng className
├── nativewind-env.d.ts         # Kiểu TypeScript cho className
├── .env                        # EXPO_PUBLIC_... (không commit); mẫu ở .env.example
├── package.json                # "main": "expo-router/entry"
└── tsconfig.json               # Alias @/* -> src/*
```

### Màn hình (`src/app/`)

| File | Đường dẫn | Ghi chú |
|---|---|---|
| `_layout.tsx` | | Gốc: provider, chặn route theo đăng nhập (`Stack.Protected`) |
| `(auth)/login.tsx`, `(auth)/register.tsx` | `/login`, `/register` | Chỉ mở được khi **chưa** đăng nhập |
| `(app)/_layout.tsx` | | Stack sau khi đăng nhập |
| `(app)/(tabs)/_layout.tsx` | | Tab bar 4 tab |
| `(app)/(tabs)/index.tsx` | `/` | Trang chủ |
| `(app)/(tabs)/menu.tsx` | `/menu` | Menu |
| `(app)/(tabs)/orders.tsx` | `/orders` | Danh sách đơn |
| `(app)/(tabs)/profile.tsx` | `/profile` | Tài khoản |
| `(app)/products/[id].tsx` | `/products/:id` | Chi tiết món, mở dạng modal |
| `(app)/orders/[id].tsx` | `/orders/:id` | Theo dõi đơn (push notification mở vào đây) |
| `(app)/cart.tsx` | `/cart` | Giỏ hàng |
| `(app)/chat.tsx` | `/chat` | Chat với quán |
| `+not-found.tsx` | | Đường dẫn không tồn tại |

Thư mục trong ngoặc như `(auth)`, `(app)`, `(tabs)` là **nhóm**: dùng để gom màn hình và layout, không xuất hiện trong
đường dẫn. Deep link: `brew://orders/123` (bản build thật) hoặc `exp://<IP>:8081/--/orders/123` (Expo Go).

Các màn hình lấy dữ liệu thật từ backend (`EXPO_PUBLIC_API_URL` trong `.env`). Chưa có: cập nhật realtime qua
WebSocket, chat, push notification.

**Từ bước giỏ hàng, app không chạy trên Expo Go nữa**: MMKV (giỏ hàng) và Google Sign-In là code native mà Expo Go
không có. Dùng development build (`npm run ios` / `npm run android`).

Luồng đặt món: **trả tiền xong mới thành đơn**. Chi tiết món (chọn tùy chọn) → Giỏ hàng → bấm "Thanh toán":
app tạo một đơn nháp (`POST /api/orders`, để server tính giá và tạo PaymentIntent) rồi mở Stripe PaymentSheet ngay
trên màn giỏ hàng.
- Trả xong: app gọi `POST /api/orders/:id/payment/confirm`, xóa giỏ, chuyển sang màn đơn.
- Đóng PaymentSheet hoặc lỗi: app hủy đơn nháp, **giỏ hàng giữ nguyên**.
- Đơn nháp (chưa từng được trả) không hiện trong tab Đơn hàng.

### Quy ước

**Mỗi thư mục giữ một loại thứ, và chỉ được import "xuống dưới":**

```
app/, components/  →  hooks/, lib/*-provider.tsx  →  stores/, services/, lib/ (cấu hình)  →  utils/  →  types/
```

| Thư mục | Chứa | Được import |
|---|---|---|
| `types/` | Chỉ `type` | `types/` |
| `utils/` | Hàm thuần (vào → ra), test được không cần app | `types/`, `utils/` |
| `lib/` (cấu hình: `query-client`, `query-keys`, `stripe`) | Cấu hình thư viện | `types/`, `utils/` |
| `services/` | Gọi backend và SDK bên ngoài. **Chỉ ở đây mới dùng `api`.** Không dùng React (component, hook) | `types/`, `utils/`, `services/` |
| `stores/` | State toàn cục (Zustand) | `types/`, `utils/` |
| `lib/*-provider.tsx` | Context React dùng cho cả app (đặt tên `*-provider.tsx`) | `types/`, `utils/`, `services/`, `stores/`, cấu hình trong `lib/` |
| `hooks/` | Hook React: gọi `services/` và thêm cache | các lớp bên dưới |
| `components/`, `app/` | Giao diện. Lấy dữ liệu qua `hooks/`, không gọi `services/` trực tiếp | mọi thứ |

Thêm một endpoint mới: viết hàm trong `services/<tên>.service.ts`, thêm khóa trong `lib/query-keys.ts`, bọc bằng hook
trong `hooks/`, rồi màn hình dùng hook đó.

Kiểu dùng ở nhiều file đặt trong `types/`; kiểu chỉ dùng bên trong một file (như `AuthState`) để lại ngay trong file đó.


- **`src/app/` chỉ chứa màn hình.** Logic và UI phức tạp tách ra `components/`, `hooks/`, `lib/`.
  Expo Router coi mọi file trong `app/` là một route, nên đừng đặt component hay helper vào đó.
- **Component dùng ở một màn hình** thì đặt cạnh màn hình đó hoặc trong `components/<tên-tính-năng>/`.
  Component dùng ở nhiều nơi thì đặt trong `components/ui/`.
- **Style bằng `className` (Tailwind).** Màu thương hiệu dùng `bg-brand`, `text-brand`, `bg-brand-50`...
  (khai báo trong `tailwind.config.js`), không hardcode mã màu trong component.
- `className` chỉ có tác dụng trên component của React Native (`View`, `Text`, `Pressable`, `ScrollView`...).
  Với component của thư viện như `Link` của Expo Router, dùng `asChild` và đặt `className` lên phần tử con.
- Icon: `@react-native-vector-icons/ionicons` (Expo khuyên dùng thay cho `@expo/vector-icons`).
- Màn hình có **thanh tiêu đề của Stack** và nội dung là `ScrollView` / `FlatList`: luôn đặt
  `contentInsetAdjustmentBehavior="automatic"`. Từ iOS 26 thanh tiêu đề nổi đè lên nội dung; thiếu prop này thì
  phần đầu màn hình bị che (React Native mặc định là `"never"`).
- Sau khi sửa `tailwind.config.js`, `babel.config.js` hoặc `metro.config.js`: chạy `npx expo start --clear`.
- **Không gọi `fetch` trực tiếp trong màn hình.** Màn hình dùng hook trong `hooks/`; hook gọi `services/`.
- Màn hình lấy dữ liệu thì xử lý đủ 3 trạng thái: `isPending` → `<LoadingView />`, `error` → `<ErrorView />`,
  có dữ liệu → nội dung. Danh sách có kéo để làm mới (`RefreshControl`).
- Thư mục `ios/` và `android/` do Expo tự sinh khi build (`npx expo prebuild` / `run:ios`), đã nằm trong `.gitignore`,
  không sửa tay.

Các file `.gitkeep` chỉ để git giữ thư mục rỗng; xóa đi khi thư mục đã có file thật.

## backend/

Dự án NestJS. Chi tiết cách chạy và cổng: [../backend/README.md](../backend/README.md).

```
backend/
├── src/
│   ├── auth/ users/ stores/ menu/ orders/ payments/ chat/   # Mỗi tính năng một module
│   │   ├── entities/    # Entity TypeORM (bảng)
│   │   ├── dto/         # Dữ liệu vào, có validate
│   │   ├── *.module.ts
│   │   ├── *.controller.ts
│   │   └── *.service.ts
│   ├── realtime/        # Socket.IO: kết nối, room, event
│   ├── push/            # Gửi push qua Expo
│   ├── uploads/         # Nhận file ảnh
│   ├── health/          # GET /api/health
│   ├── common/          # Guard, decorator, tiện ích dùng chung
│   ├── config/          # Kiểm tra biến môi trường
│   ├── database/        # Kết nối, migrations/, seed.ts
│   ├── app.module.ts
│   └── main.ts
├── test/                # Test e2e
├── uploads/             # File người dùng upload (không commit)
├── docker-compose.yml   # PostgreSQL
├── .env.example         # Mẫu biến môi trường (commit)
└── .env                 # Giá trị thật, secret (không commit)
```
