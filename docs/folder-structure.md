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
│   │   ├── ui/                 # Text (font Be Vietnam Pro), Button, TextField, PriceField, SwitchRow, Chip, QuantityStepper, LoadingView...
│   │   ├── menu/               # ProductCard (ô lưới 2 cột), CategoryChips, PromoBanner
│   │   ├── admin-menu/         # Quản lý menu: dòng món có công tắc còn hàng, chọn ảnh, dòng tuỳ chọn, khung form
│   │   ├── chat/chat-thread.tsx  # Giao diện chat dùng chung cho khách và quán
│   │   ├── chat/chat-scroll-view.tsx # Danh sách tin nhắn đi theo bàn phím (KeyboardChatScrollView)
│   │   ├── staff-order-card.tsx  # Thẻ đơn của quán + hook chạy hành động (có hỏi lại khi hoàn tiền)
│   │   ├── floating-tab-bar.tsx  # Tab bar nổi, chỉ có icon
│   │   ├── animated-splash.tsx # Splash động (Lottie) nối tiếp splash native khi mở app
│   │   ├── order-list-skeleton.tsx # Khung chờ của danh sách đơn
│   │   └── cart-button.tsx     # Icon giỏ hàng có badge (header màn Menu, ô vuông cạnh ô tìm kiếm ở Trang chủ)
│   ├── hooks/                  # Hook React: thêm cache (TanStack Query) cho services/
│   │   ├── queries.ts          # useMe, useMenu, useOrders... và useCreateOrder, useCancelOrder
│   │   ├── payments.ts         # usePayOrder (Stripe PaymentSheet), useConfirmPayment
│   │   ├── cart-check.ts       # useCartCheck: so giỏ hàng với menu hiện tại (giá mới, món/tùy chọn đã hết)
│   │   ├── chat.ts             # useChatMessages (cuộn lên tải thêm), useSendMessage, useChatSummary
│   │   ├── staff.ts            # Màn quán: useStaffOrders, useUpdateOrderStatus, useStaffConversations...
│   │   ├── admin-menu.ts       # Quản lý menu: danh mục, món (kèm upload ảnh), nhóm tuỳ chọn
│   │   ├── admin-shop.ts       # Cửa hàng, thống kê doanh thu
│   │   ├── discard-guard.ts    # useDiscardGuard: hỏi "Bỏ thay đổi?" khi rời form chưa lưu
│   │   ├── app-resume.ts       # useAppSplash: splash lúc mở app và khi quay lại sau thời gian dài
│   │   └── status-bar.ts       # useLightStatusBar: chữ status bar màu trắng cho màn có nền tối
│   ├── services/               # Gọi ra bên ngoài: backend, keychain, Google
│   │   ├── api-client.ts       # fetch + token + tự refresh khi 401 (1 lần refresh cùng lúc)
│   │   ├── session.ts          # Client API dùng chung + lưu token vào keychain (expo-secure-store)
│   │   ├── auth.service.ts     # /auth: login, register, Google, logout
│   │   ├── user.service.ts     # /me
│   │   ├── menu.service.ts     # /menu, /products, /stores
│   │   ├── order.service.ts    # /orders và thanh toán
│   │   ├── chat.service.ts     # /chat; gửi tin qua WebSocket, không trả lời thì gửi qua REST
│   │   ├── staff.service.ts    # /admin: đơn hàng, đổi trạng thái, chat với khách
│   │   ├── admin-menu.service.ts # /admin/categories, /admin/products (+ ảnh), /admin/option-groups, /admin/options
│   │   ├── admin-shop.service.ts # /admin/stores, /admin/stats/sales
│   │   ├── socket.ts           # Kết nối Socket.IO duy nhất của app
│   │   ├── notifications.ts    # expo-notifications: xin quyền, push token, bấm vào thông báo
│   │   └── google-sign-in.ts   # SDK Google Sign-In
│   ├── lib/                    # Cấu hình thư viện và provider dùng cho cả app
│   │   ├── app-providers.tsx   # Gom mọi provider; app/_layout.tsx chỉ dùng cái này
│   │   ├── auth-provider.tsx   # AuthProvider / useAuth: trạng thái đăng nhập
│   │   ├── socket-provider.tsx # Kết nối WebSocket khi đăng nhập; event của server → cập nhật cache
│   │   ├── catalog-cache.ts    # Tải lại mọi dữ liệu menu / cửa hàng trong cache
│   │   ├── push-provider.tsx   # Đăng ký push token khi đăng nhập; bấm thông báo → mở đơn / chat
│   │   ├── nativewind-interop.ts # Cho component của thư viện khác dùng được className
│   │   ├── query-client.ts     # Cấu hình TanStack Query
│   │   ├── query-keys.ts       # Khóa cache dùng chung
│   │   └── stripe.ts           # Publishable key, URL quay lại app của Stripe
│   ├── stores/
│   │   └── cart.ts             # Giỏ hàng: Zustand, lưu xuống máy bằng MMKV
│   ├── types/                  # Chỉ kiểu dữ liệu, không có code chạy
│   │   ├── api.ts              # Dữ liệu backend trả về và body gửi lên
│   │   ├── auth.ts             # Tokens, TokenStore
│   │   ├── cart.ts             # CartItem, ChosenOption, Selection
│   │   ├── payment.ts          # ConfirmResult, PayResult
│   │   ├── realtime.ts         # Event WebSocket, ChatMessage, ChatSummary
│   │   └── notifications.ts    # `data` của push notification backend gửi
│   ├── utils/                  # Hàm thuần: không React, không gọi mạng
│   │   ├── api-error.ts        # Lớp ApiError
│   │   ├── errors.ts           # Đổi lỗi thành câu tiếng Việt
│   │   ├── format.ts           # Tiền VND, ngày giờ, tên trạng thái đơn
│   │   ├── cart-pricing.ts     # Chọn tùy chọn món, kiểm tra min/max, tính giá
│   │   ├── chat-cache.ts       # Thêm tin vào cache chat không bị trùng
│   │   ├── uuid.ts             # clientId cho tin nhắn
│   │   ├── jwt.ts              # Đọc role trong access token (không xác minh; backend mới xác minh)
│   │   ├── staff-orders.ts     # Nút hành động cho từng trạng thái đơn (khớp quy tắc backend), các tab
│   │   ├── admin-menu.ts       # Form quản lý menu: kiểm tra dữ liệu, tính các request khi lưu nhóm tuỳ chọn
│   │   ├── admin-stores.ts     # Form cửa hàng: giờ mở cửa từng ngày, toạ độ
│   │   ├── search.ts           # Tìm món không phân biệt dấu ("ca phe" ra "Cà phê")
│   │   ├── order-progress.ts   # Thanh tiến trình 4 bước và câu mô tả từng trạng thái đơn
│   │   ├── notification-route.ts # Bấm thông báo thì mở màn nào (khách / quán)
│   │   └── app-resume.ts       # Mốc thời gian vắng app: tải lại dữ liệu / chạy lại splash
│   ├── constants/
│   │   └── theme.ts            # COLORS, FONTS cho prop không nhận className (màu icon, tintColor, header)
│   └── global.css              # Tailwind; import một lần ở app/_layout.tsx
├── assets/                     # Icon, splash, ảnh tĩnh (images/figma/: ảnh lấy từ thiết kế Figma)
│   └── animations/brew-splash.json # Animation Lottie của splash
├── scripts/brand/generate.py   # Sinh icon, ảnh splash và file Lottie từ cùng một hình (xem "Splash" bên dưới)
├── plugins/with-android-theme.js # Màu thương hiệu cho widget Android (nút Alert, công tắc), áp dụng khi prebuild
├── app.json                    # Cấu hình Expo: tên, bundle id, scheme "brew", plugin
├── babel.config.js             # NativeWind (biến className thành style)
├── metro.config.js             # NativeWind đọc src/global.css
├── tailwind.config.js          # Màu và font theo styleguide Figma, đường dẫn file dùng className
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
| `(app)/...` | `/`, `/menu`, `/cart`... | Chỉ cho tài khoản **customer** |
| `admin/...` | `/admin/...` | Chỉ cho tài khoản **staff** và **admin**; role đọc từ access token, nên mở app không cần mạng vẫn biết vào khu nào |
| `(app)/_layout.tsx` | | Stack sau khi đăng nhập |
| `(app)/(tabs)/_layout.tsx` | | Tab bar 4 tab |
| `(app)/(tabs)/index.tsx` | `/` | Trang chủ: tìm món, banner, lọc theo danh mục, lưới món |
| `(app)/(tabs)/menu.tsx` | `/menu` | Cả menu, chia theo danh mục |
| `(app)/(tabs)/orders.tsx` | `/orders` | Danh sách đơn |
| `(app)/(tabs)/profile.tsx` | `/profile` | Tài khoản |
| `(app)/products/[id].tsx` | `/products/:id` | Chi tiết món |
| `(app)/orders/[id].tsx` | `/orders/:id` | Theo dõi đơn: thanh tiến trình, quán (chat), món đã đặt. Push notification mở vào đây |
| `(app)/cart.tsx` | `/cart` | Giỏ hàng |
| `(app)/chat.tsx` | `/chat` | Chat với quán |
| `admin/(tabs)/orders.tsx` | `/admin/orders` | **Quán:** hàng đợi đơn theo trạng thái, nút cho bước tiếp theo |
| `admin/(tabs)/chats.tsx` | `/admin/chats` | **Quán:** danh sách khách đang chat, số tin chưa đọc |
| `admin/(tabs)/menu.tsx` | `/admin/menu` | **Admin:** cả menu theo danh mục, tìm món, công tắc còn hàng/hết hàng |
| `admin/(tabs)/account.tsx` | `/admin/account` | **Quán:** tài khoản, đăng xuất |
| `admin/orders/[id].tsx` | `/admin/orders/:id` | **Quán:** chi tiết đơn, khách, ghi chú, thanh toán |
| `admin/chats/[id].tsx` | `/admin/chats/:id` | **Quán:** chat với một khách |
| `admin/menu/categories/index.tsx` | `/admin/menu/categories` | **Admin:** danh sách danh mục |
| `admin/menu/categories/[id].tsx` | `/admin/menu/categories/:id` | **Admin:** thêm (`new`), đổi tên, thứ tự, xoá danh mục |
| `admin/menu/products/[id].tsx` | `/admin/menu/products/:id` | **Admin:** thêm (`new`, `?categoryId=`) hoặc sửa món: ảnh, giá, danh mục, nhóm tuỳ chọn |
| `admin/menu/option-groups/[id].tsx` | `/admin/menu/option-groups/:id?productId=` | **Admin:** một nhóm tuỳ chọn (Size...) và các lựa chọn |
| `admin/stats.tsx` | `/admin/stats` | **Admin:** doanh thu hôm nay / 7 / 30 ngày, biểu đồ theo ngày, món bán chạy, theo cửa hàng |
| `admin/stores/index.tsx` | `/admin/stores` | **Admin:** danh sách cửa hàng (cả quán tạm đóng) |
| `admin/stores/[id].tsx` | `/admin/stores/:id` | **Admin:** thêm (`new`) hoặc sửa cửa hàng: thông tin, toạ độ, tạm đóng, giờ mở cửa |
| `+not-found.tsx` | | Đường dẫn không tồn tại |

Thư mục trong ngoặc như `(auth)`, `(app)`, `(tabs)` là **nhóm**: dùng để gom màn hình và layout, không xuất hiện trong
đường dẫn. Deep link: `brew://orders/123` (bản build thật) hoặc `exp://<IP>:8081/--/orders/123` (Expo Go).

Các màn hình lấy dữ liệu thật từ backend (`EXPO_PUBLIC_API_URL` trong `.env`).

**Splash** gồm 2 lớp nối liền nhau:
1. **Native splash** (`expo-splash-screen` trong `app.json`): hệ điều hành hiện ngay khi bấm icon, lúc JS chưa chạy.
   Chỉ là ảnh tĩnh: `assets/splash.png` trên nền `#050505`.
2. **Splash động** (`components/animated-splash.tsx`, Lottie): vẽ bằng React, khung đầu **giống hệt** ảnh native
   (cùng kích thước 200, cùng vị trí giữa màn hình), nên khi gọi `SplashScreen.hide()` không thấy gì thay đổi.
   Sau đó hơi nước bốc lên từ ly, chữ "Brew" hiện dần (~1,4 giây), trong lúc app vẫn đọc trạng thái đăng nhập.
   Splash mờ dần khi **cả** animation **và** app đã xong. Bật "Giảm chuyển động" thì bỏ animation, chỉ mờ dần.
   Chạy khi mở app từ đầu (cold start), và khi quay lại sau thời gian dài ở nền (xem bên dưới).

Ảnh splash, file Lottie và icon app được sinh từ cùng một bộ hình bằng `python3 scripts/brand/generate.py`
(chạy trong `mobile/`, cần macOS). Đổi hình thì sửa script, chạy lại, rồi build lại app (splash và icon là native).

**Quay lại app sau một thời gian ở nền** (`hooks/app-resume.ts`, mốc thời gian ở `utils/app-resume.ts`).
App ở nền (về màn hình chính, chưa vuốt tắt) vẫn giữ màn hình cũ. Khi quay lại:
- vắng dưới `REFRESH_AFTER_MS`: giữ nguyên (dữ liệu cũ hơn `staleTime` vẫn tự tải lại như mọi lần);
- vắng từ `REFRESH_AFTER_MS`: tải lại **mọi** dữ liệu, giữ nguyên màn hình;
- vắng từ `RESTART_AFTER_MS`: chạy lại splash Lottie, trong lúc đó về màn chính (khách: Trang chủ, hoặc màn đơn
  nếu đang có đơn chưa lấy; quán: Đơn hàng) và tải lại mọi dữ liệu. Người dùng thấy như mở lại app, nhưng JS
  không chạy lại nên giỏ hàng và đăng nhập vẫn giữ.

Đang để 2 phút / 4 phút để thử; bản thật dự kiến 20 phút / 1 giờ. App bị hệ điều hành tắt hẳn thì lần sau là
cold start, không qua bước này.

**Push notification** (khi app chạy nền hoặc đã tắt; WebSocket chỉ chạy khi app đang mở). Backend gửi qua Expo Push
(`backend/src/push`): khách nhận "quán đã nhận đơn", "đồ uống đã sẵn sàng", "đơn bị hủy" và tin chat; quán nhận
"đơn mới" và tin chat. App (`lib/push-provider.tsx`):
- Đăng nhập → gửi push token lên `POST /api/me/push-tokens` (gửi lại khi token đổi). Quán được hỏi quyền ngay khi
  đăng nhập; khách được hỏi ngay sau lần thanh toán đầu, lúc "báo khi đồ uống sẵn sàng" có ý nghĩa.
- Bấm thông báo → mở màn đơn hoặc chat (`utils/notification-route.ts`).
- Đăng xuất → gửi token kèm `/auth/logout` để máy này không nhận thông báo của tài khoản cũ nữa.

Cài đặt push (đã làm cho Android; iOS chưa):
1. **Expo project:** `npx eas-cli init` đã ghi `extra.eas.projectId` (+ `owner`) vào `app.json`. Expo cấp push token
   theo project; thiếu projectId thì app bỏ qua bước đăng ký và cảnh báo trong console.
2. **Android (FCM V1):** Firebase project `brew-d9c3e`, app `com.brew.reactnative`.
   - `mobile/google-services.json` (commit được, chỉ chứa mã định danh) khai báo ở `android.googleServicesFile`.
   - Khoá service account (`*-firebase-adminsdk-*.json`) là **bí mật**: không để trong repo (`.gitignore` đã chặn),
     chỉ upload lên Expo bằng `npx eas-cli credentials -p android` → Google Service Account → FCM V1.
     Đổi khoá thì upload lại.
3. **iOS (APNs):** cần tài khoản Apple Developer trả phí: `npx eas-cli credentials -p ios` → Push Notifications.
   Chưa có thì thử bằng `xcrun simctl push` (thông báo giả trên simulator).
4. Build lại app sau khi đổi các file trên (`npx expo prebuild --clean`, rồi `npm run android` / `npm run ios`).

Thử nhanh: đăng nhập tài khoản quán trên máy Android (được hỏi quyền ngay), cho app xuống nền, rồi tạo một đơn và
`POST /api/dev/orders/:id/mark-paid` (chỉ có khi không phải production): máy quán nhận "Đơn mới", bấm vào mở đúng đơn.
`eas.json` có sẵn các profile `development` / `preview` / `production` cho EAS Build sau này.
- Backend gửi mọi push với `priority: 'high'`: để mặc định (normal) thì Android giữ tin FCM lại, có khi vài phút.
- Emulator mở lại từ snapshot có thể mất kết nối FCM (`FirebaseMessaging ... AUTHENTICATION_FAILED` trong
  `adb logcat`): push gửi thành công nhưng không tới máy. Khởi động lạnh: `emulator -avd Pixel_8 -no-snapshot-load`.
- Bản dev: push tới đúng lúc app vừa mở và còn đang tải JS thì không hiện (chưa có ai trả lời
  `setNotificationHandler`). Bản phát hành tải JS ngay nên gần như không gặp.

**Realtime:** `lib/socket-provider.tsx` giữ WebSocket kết nối khi đã đăng nhập. Event `order:updated` làm màn đơn và
danh sách đơn tự tải lại; `message:new` thêm tin vào màn chat; `conversation:read` cập nhật số tin chưa đọc. Token
hết hạn thì refresh rồi kết nối lại; mỗi lần kết nối lại thì tải lại dữ liệu đang có trong cache, vì event phát ra
lúc mất kết nối không được gửi lại.

**Từ bước giỏ hàng, app không chạy trên Expo Go nữa**: MMKV (giỏ hàng) và Google Sign-In là code native mà Expo Go
không có. Dùng development build (`npm run ios` / `npm run android`).

**Build Android** (emulator `Pixel_8`):
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk          # nên thêm vào ~/.zshrc
$ANDROID_HOME/emulator/emulator -avd Pixel_8 &
$ANDROID_HOME/platform-tools/adb reverse tcp:3100 tcp:3100   # chạy lại mỗi khi emulator khởi động
npx expo prebuild --clean -p android
npx expo run:android -d Pixel_8
```
- Thiếu `ANDROID_HOME` thì Gradle báo "SDK location not found" (`prebuild --clean` xoá `android/local.properties`).
- `adb reverse`: backend trả link ảnh `http://localhost:3100/...`, mà `localhost` trên Android là chính máy đó.
- Android 17 hỏi quyền **thiết bị lân cận** (truy cập mạng LAN) lần đầu mở bản dev, vì JS tải từ Metro ở
  `192.168.x.x`. Chọn Allow. Bản phát hành gọi server trên internet thì không cần.
- Push thật trên Android cần `google-services.json` (Firebase), xem phần Push notification.
- Màu: `app.json` có `primaryColor`, còn màu nhấn và nút tròn công tắc màu trắng do `plugins/with-android-theme.js`.
  `thumbColor` của `<Switch>` không đổi được màu nút tròn trên Android (React Native chỉ nhân màu lên màu theme).

Luồng đặt món: **trả tiền xong mới thành đơn**. Chi tiết món (chọn tùy chọn) → Giỏ hàng → bấm "Thanh toán":
app tạo một đơn nháp (`POST /api/orders`, để server tính giá và tạo PaymentIntent) rồi mở Stripe PaymentSheet ngay
trên màn giỏ hàng.
- Giỏ hàng lưu giá lúc thêm món, và được giữ cả khi tắt app. Nên mỗi lần mở giỏ, `useCartCheck` tải lại chi tiết
  từng món (menu không có giá tùy chọn) rồi kiểm tra như backend (`checkCartItem`, giống `order-pricing.ts`):
  giá đổi thì cập nhật vào giỏ và báo khách; món hoặc tùy chọn đã hết thì hiện lý do trên dòng đó và khóa nút
  Thanh toán đến khi khách xóa dòng.
- Sau khi tạo đơn nháp, nếu `order.subtotal` (tiền món) của server khác tổng tiền khách đang thấy (giá vừa đổi), app hủy đơn nháp,
  tải lại giá và không mở PaymentSheet.
- Trả xong: app gọi `POST /api/orders/:id/payment/confirm`, xóa giỏ, chuyển sang màn đơn.
- Đóng PaymentSheet hoặc lỗi: app hủy đơn nháp, **giỏ hàng giữ nguyên**.
- Đơn nháp (chưa từng được trả) không hiện trong tab Đơn hàng.

**Quản lý menu** (tab Menu, chỉ tài khoản **admin**; nhân viên không thấy tab này và backend cũng trả 403):
- Danh sách món theo danh mục, có cả món hết hàng. Công tắc trên mỗi dòng đổi Còn hàng/Hết hàng ngay
  (đổi trên màn trước, request lỗi thì trả lại như cũ).
- Món mới: điền thông tin rồi Lưu, sau đó mới thêm nhóm tuỳ chọn (nhóm cần id của món). Ảnh chọn từ thư viện
  (`expo-image-picker`, cắt vuông), **tải lên khi bấm Lưu** (`POST /admin/products/:id/image`, multipart).
  Ảnh được thêm vào FormData bằng `new File(uri)` của `expo-file-system`, **không** dùng `{ uri, name, type }` như
  React Native cũ: từ SDK 58, `fetch` toàn cục là `expo/fetch`, chỉ gửi được Blob/File (lỗi
  "Unsupported FormDataPart implementation").
- Nhóm tuỳ chọn: sửa cả nhóm rồi Lưu một lần. `planOptionChanges` so với bản đã lưu để chỉ gửi những gì đổi
  (xoá dòng bị bỏ, sửa dòng đổi, tạo dòng mới; thứ tự trên màn = `sortOrder`).
- Form chưa lưu mà bấm quay lại thì hỏi "Bỏ thay đổi?" (`useDiscardGuard`).
- Xoá danh mục chỉ được khi danh mục không còn món. Xoá món không ảnh hưởng đơn cũ (đơn giữ tên và giá đã bán).
- Lưu xong, máy này tải lại menu ngay. Máy khác nhận `menu:updated` qua WebSocket và tải lại trong vài giây
  (giỏ hàng đang mở cũng kiểm tra lại giá). Sửa cửa hàng thì có `stores:updated`.
- **Thống kê** và **Cửa hàng** nằm trong tab Tài khoản (mục Quản lý). Doanh thu chỉ tính đơn đã thanh toán và
  không bị huỷ, theo ngày đặt (giờ Việt Nam); màn thống kê tự cập nhật khi có `order:updated`.

### Kiểm tra code

```bash
cd mobile
npm test           # Jest (jest-expo): test trong các thư mục __tests__/
npm run lint       # ESLint (eslint-config-expo), gồm luật React Compiler
npx tsc --noEmit   # TypeScript
```

Test đặt cạnh code trong `__tests__/` (ví dụ `utils/__tests__/cart-pricing.test.ts`), **không đặt trong `src/app/`**
vì Expo Router coi mọi file ở đó là một màn hình. Đang có test cho:
- `utils/cart-pricing.ts`: chọn tùy chọn, tính giá, kiểm tra dòng trong giỏ;
- `utils/chat-cache.ts`: tin nhắn đến hai lần không bị trùng;
- `utils/admin-menu.ts`: kiểm tra form món và nhóm tuỳ chọn, các request khi lưu nhóm tuỳ chọn;
- `utils/app-resume.ts`: vắng bao lâu thì làm gì, đơn nào đang chạy;
- `services/api-client.ts`: với một backend giả **đổi refresh token sau mỗi lần dùng**, nhiều request cùng bị
  401 chỉ gây ra **một** lần refresh. Nếu refresh chạy song song, refresh token bị dùng lại và backend thật sẽ
  coi là bị đánh cắp, đăng xuất khách khỏi mọi thiết bị.

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
- **Giao diện theo thiết kế Figma** "Coffee Shop Mobile App Design" (chỉ lấy style, ảnh, bố cục; logic là của Brew,
  ví dụ chỉ nhận tại quán, không giao hàng).
- **Style bằng `className` (Tailwind).** Màu khai báo trong `tailwind.config.js`: `brand` (nâu cà phê), `ink`
  (chữ: `text-ink`, `text-ink-soft`, `text-ink-muted`), `line` (viền), `surface` (nền), `night` (nền tối).
  Không hardcode mã màu trong component; prop không nhận `className` thì dùng `COLORS` trong `constants/theme.ts`.
- **Chữ: dùng `Text` của `@/components/ui/text`, không import `Text` từ `react-native`.** Font Be Vietnam Pro được nạp theo
  từng độ đậm, đặt theo tên PostScript (`BeVietnamPro-SemiBold`...; tên khác thì iOS đo chữ sai, chữ bị cắt), nên `font-semibold` của Text gốc sẽ rơi về font hệ thống; `Text` của app tự
  đổi `font-light/normal/medium/semibold/bold` sang đúng font. `TextInput` thì thêm class `font-app`.
- **Font phải có đủ chữ tiếng Việt.** Figma dùng Sora, nhưng Sora thiếu 96 ký tự tiếng Việt (ạ, ả, ỉ, ư có dấu, ố...):
  máy lấy chữ thiếu từ font hệ thống nên một từ có hai font, dấu lệch. Đổi font thì kiểm tra lại đủ ký tự trước.
- `className` chỉ có tác dụng trên component của React Native (`View`, `Text`, `Pressable`, `ScrollView`...).
  Với component của thư viện như `Link` của Expo Router, dùng `asChild` và đặt `className` lên phần tử con.
- Icon: `@react-native-vector-icons/ionicons` (Expo khuyên dùng thay cho `@expo/vector-icons`).
- **Bàn phím:** dùng `react-native-keyboard-controller`, không dùng `KeyboardAvoidingView`.
  Form: `KeyboardAwareScrollView` (+ `KeyboardToolbar` nếu nhiều ô). Chat: `KeyboardChatScrollView` cho danh sách
  (qua `renderScrollComponent`, xem `components/chat/chat-scroll-view.tsx`) và `KeyboardStickyView` cho thanh nhập.
  Component của thư viện khác muốn dùng `className` thì đăng ký trong `lib/nativewind-interop.ts`.
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
│   ├── auth/ users/ stores/ menu/ orders/ payments/ chat/ stats/   # Mỗi tính năng một module
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
├── seed-images/products/ # Ảnh thật cho món mẫu, tên file = slug của món (ca-phe-sua-da.jpg); seed copy vào uploads/
├── docker-compose.yml   # PostgreSQL
├── .env.example         # Mẫu biến môi trường (commit)
└── .env                 # Giá trị thật, secret (không commit)
```
