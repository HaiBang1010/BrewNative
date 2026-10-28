# Backend

API cho app Brew: NestJS 12 + TypeORM + PostgreSQL 18 (Docker).

- Thiết kế dữ liệu, luồng xử lý, danh sách endpoint: [../docs/data-model-and-flow.md](../docs/data-model-and-flow.md)
- Cấu hình đăng nhập Google: [../docs/google-sign-in.md](../docs/google-sign-in.md)

**Đã có:** auth (email/mật khẩu, Google, refresh token xoay vòng), phân quyền customer/staff/admin, hồ sơ và ảnh đại diện,
push token, cửa hàng, menu (danh mục, món, tùy chọn), đặt đơn (server tự tính giá), quy trình trạng thái đơn,
tự hủy đơn chưa thanh toán, thanh toán Stripe (PaymentIntent, webhook, hoàn tiền), chat khách và quán
(REST + WebSocket), cập nhật đơn realtime (WebSocket), push notification, Swagger, seed dữ liệu mẫu.

## Cổng

| Dịch vụ | Cổng trên máy | Ghi chú |
|---|---|---|
| Backend | **3100** | Cổng 3000 hay bị các dự án khác dùng |
| PostgreSQL | **5440** | 5432–5435 đã có Postgres của dự án khác; chỉ mở cho `127.0.0.1` |

Đổi cổng: sửa `PORT` / `DB_PORT` trong `.env`. `docker-compose.yml` đọc cùng file `.env` này.

## Chạy lần đầu

```sh
cd backend
npm install
cp .env.example .env          # rồi đổi JWT_ACCESS_SECRET (lệnh tạo có trong file)
npm run db:up                 # bật Postgres
npm run migration:run         # tạo bảng
npm run seed                  # dữ liệu mẫu
npm run start:dev             # chạy API, tự reload khi sửa code
```

- Kiểm tra: http://localhost:3100/api/health
- WebSocket (Socket.IO): `ws://localhost:3100` với `auth: { token: accessToken }`. Event và cách kết nối:
  [../docs/data-model-and-flow.md#websocket](../docs/data-model-and-flow.md#websocket)
- Tài liệu API + thử trực tiếp: **http://localhost:3100/api/docs**. Gọi `POST /api/auth/login`, copy `accessToken`,
  bấm **Authorize** ở góc trên rồi dán vào.

Tài khoản mẫu do `npm run seed` tạo:

| Email | Mật khẩu | Role |
|---|---|---|
| `admin@brew.local` | `Admin@12345` (đổi qua `SEED_ADMIN_*` trong `.env`) | admin |
| `staff@brew.local` | `Password@123` | staff |
| `customer@brew.local` | `Password@123` | customer |

## Gọi API từ app trên điện thoại

Điện thoại không hiểu `localhost`. Dùng IP của Mac trong mạng Wi-Fi (xem bằng `ipconfig getifaddr en0`), ví dụ:

- App gọi `http://192.168.0.13:3100/api`
- Đặt `PUBLIC_URL=http://192.168.0.13:3100` trong `.env` để link ảnh upload mở được trên điện thoại.

## Thanh toán Stripe (khi phát triển)

1. Dashboard Stripe (chế độ **Test**) → Developers → API keys: chép `sk_test_...` vào `STRIPE_SECRET_KEY`,
   `pk_test_...` vào `STRIPE_PUBLISHABLE_KEY` (không bắt buộc; backend gửi kèm cho app).
2. Mở một terminal riêng: `npm run stripe:listen`. Lần đầu, chép `whsec_...` nó in ra vào `STRIPE_WEBHOOK_SECRET`
   rồi khởi động lại backend. Để terminal này chạy suốt lúc thử thanh toán: nó chuyển webhook từ Stripe về máy.
3. App: tạo đơn → `POST /api/orders/:id/payment` → mở PaymentSheet với `clientSecret`.
   Thẻ test: `4242 4242 4242 4242` (thành công), `4000 0000 0000 0002` (bị từ chối), ngày hết hạn bất kỳ trong tương lai.
4. Thấy dòng `--> payment_intent.succeeded` và `<-- [200]` trong terminal `stripe:listen` là đơn đã sang `paid`.

**Khi deploy:** Dashboard → Developers → Webhooks → thêm endpoint `https://<domain>/api/webhooks/stripe`,
chọn các event `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.processing`,
`payment_intent.requires_action`, `payment_intent.canceled`, `charge.refunded`, rồi dùng signing secret của endpoint đó
cho `STRIPE_WEBHOOK_SECRET`.

Tài khoản Stripe test hiện tại ở Singapore và nhận VND; số tiền tối thiểu mỗi lần thanh toán khoảng $0.50 (~12.000₫).

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run start:dev` | Chạy API ở chế độ dev |
| `npm run db:up` / `db:down` / `db:logs` | Bật / tắt / xem log Postgres (tắt vẫn giữ dữ liệu) |
| `npm run stripe:listen` | Chạy Stripe CLI trong Docker, chuyển webhook về backend và in ra `whsec_...` (cần `STRIPE_SECRET_KEY` trong `.env`) |
| `npm run migration:run` | Chạy các migration chưa chạy |
| `npm run migration:generate -- src/database/migrations/<TenMigration>` | Sinh migration từ thay đổi entity |
| `npm run migration:revert` | Hoàn tác migration gần nhất |
| `npm run migration:show` | Xem migration nào đã chạy |
| `npm run seed` | Thêm dữ liệu mẫu (chạy lại không bị trùng). Món còn ảnh tạm thì lấy ảnh thật trong `seed-images/products/` |
| `npm test` | Unit test (Vitest) |
| `npm run db:test:prepare` | Tạo database `brew_test` riêng cho test và chạy migration (làm lần đầu, và sau mỗi migration mới) |
| `npm run test:e2e` | Test e2e trên database `brew_test`, gồm WebSocket và Stripe (phần Stripe cần key test và mạng, tự bỏ qua nếu thiếu key). Chạy được cả khi server dev và `stripe:listen` đang bật |
| `npm run lint` | Lint (oxlint) |

Xóa sạch database để làm lại từ đầu: `docker compose down -v`, rồi `db:up`, `migration:run`, `seed`.

### Thay đổi database

`synchronize` của TypeORM **tắt**: database chỉ đổi qua migration.

1. Sửa hoặc thêm file `*.entity.ts`.
2. `npm run migration:generate -- src/database/migrations/AddSomething`
3. Đọc file migration vừa sinh, kiểm tra SQL hợp lý.
4. `npm run migration:run`

Các lệnh migration và seed chạy trên code đã build (`dist/`), nên lệnh tự build trước.

## Biến môi trường

Xem [.env.example](.env.example). Thiếu hoặc sai kiểu thì server không khởi động và báo rõ biến nào
(kiểm tra ở [src/config/env.validation.ts](src/config/env.validation.ts)).

| Biến | Ý nghĩa |
|---|---|
| `JWT_ACCESS_SECRET` | Khóa ký access token, tối thiểu 32 ký tự. **Bí mật.** |
| `JWT_ACCESS_TTL_SECONDS` | Hạn access token, tối đa 86400 (mặc định 900 = 15 phút). Socket bị ngắt khi token hết hạn |
| `REFRESH_TOKEN_TTL_DAYS` | Hạn refresh token (mặc định 30 ngày) |
| `GOOGLE_CLIENT_IDS` | Client ID của Google, cách nhau bằng dấu phẩy. Trống = tắt đăng nhập Google |
| `EXPO_ACCESS_TOKEN` | Chỉ cần nếu bật "Enhanced push security" trên Expo |
| `ORDER_PAYMENT_TIMEOUT_MINUTES` | Đơn chưa thanh toán quá thời gian này sẽ tự hủy (mặc định 15) |
| `PUBLIC_URL` | Địa chỉ gốc để tạo link ảnh upload |
| `STRIPE_SECRET_KEY` | `sk_test_...` / `sk_live_...`. **Bí mật.** Trống = tắt thanh toán (endpoint trả 503) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` để xác minh webhook. **Bí mật.** |
| `STRIPE_PUBLISHABLE_KEY` | `pk_...`, công khai; gửi kèm cho app cùng `clientSecret` |

## Cấu trúc

```
src/
├── auth/          # Đăng ký, đăng nhập, Google, refresh, logout
├── users/         # /me (hồ sơ, mật khẩu, avatar, push token), /admin/users
├── stores/        # Cửa hàng
├── menu/          # Danh mục, món, nhóm tùy chọn, tùy chọn
├── orders/        # Đơn hàng: tính giá, trạng thái, job hủy đơn quá hạn
├── payments/      # Stripe: PaymentIntent, webhook, hoàn tiền (móc vào việc đổi trạng thái đơn)
├── chat/          # Chat khách và quán (REST + chat.gateway.ts cho WebSocket)
├── realtime/      # Socket.IO: xác thực kết nối, room, kiểu dữ liệu event, gửi event
├── push/          # Gửi push qua Expo
├── uploads/       # Nhận file ảnh, lưu vào ./uploads
├── health/        # GET /api/health
├── common/        # Guard (JWT, role), decorator, DTO phân trang, tiện ích
├── config/        # Kiểm tra biến môi trường
├── database/      # Kết nối, migration, seed
├── app.module.ts
└── main.ts        # Prefix /api, CORS, validation, Swagger, file tĩnh /uploads
```

Mỗi module gồm `entities/` (bảng), `dto/` (dữ liệu vào, có validate), `*.service.ts` (logic),
`*.controller.ts` (endpoint), `*.module.ts`.

### Quy ước

- **Mọi route mặc định cần đăng nhập.** Route công khai đánh dấu `@Public()`; giới hạn role bằng `@Roles(...)`.
  Lấy user hiện tại bằng `@CurrentUser()`.
- Route cho nhân viên/admin nằm dưới `/api/admin/...`.
- Dữ liệu vào luôn qua DTO có `class-validator`. Field không khai báo trong DTO sẽ bị từ chối (400).
- Tiền là số nguyên VND. Không bao giờ nhận giá từ app.
- Đổi trạng thái đơn chỉ qua `OrdersService.transition()`.
- Push gửi kiểu fire-and-forget: push lỗi không làm hỏng request.
- Gửi event WebSocket qua `RealtimeService` (không gọi Socket.IO trực tiếp). Tên event và kiểu dữ liệu khai báo ở
  `realtime/realtime.events.ts`. Handler WebSocket bọc trong `reply()` và kiểm tra dữ liệu bằng `parseDto()` để
  client luôn nhận ack `{ ok, data | error }`.
- Global guard của Nest chạy cả trên handler WebSocket; guard mới phải xử lý được `context.getType() === 'ws'`.
- File upload lưu trên đĩa ở `./uploads` (đã gitignore). Khi deploy thật nên chuyển sang S3 hoặc dịch vụ tương tự.
