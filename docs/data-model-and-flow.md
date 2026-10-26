# Data model và data flow

Thiết kế dữ liệu và luồng xử lý. Code thật nằm ở `backend/src/**/entities/*.entity.ts`; khi đổi entity thì cập nhật file này.

**Trạng thái:** đã làm tất cả, **trừ** Stripe (bảng `payments`, `stripe_events`, webhook).
Những chỗ đó trong code được đánh dấu `TODO(stripe)`.

Sơ đồ viết bằng [Mermaid](https://mermaid.js.org/). GitHub hiển thị sẵn; trong VS Code cài extension
"Markdown Preview Mermaid Support" rồi mở preview (`Cmd + Shift + V`).

## Tổng quan hệ thống

```mermaid
flowchart LR
  App["Mobile app<br/>(Expo)"]
  Admin["Admin web<br/>(nhân viên quán)"]
  API["Backend<br/>(NestJS)"]
  DB[("PostgreSQL")]
  Stripe["Stripe"]
  Expo["Expo Push Service"]

  App -- "REST (HTTPS)" --> API
  App <-- "WebSocket" --> API
  Admin -- "REST" --> API
  Admin <-- "WebSocket" --> API
  API --> DB
  App -- "PaymentSheet" --> Stripe
  API -- "tạo PaymentIntent" --> Stripe
  Stripe -- "webhook" --> API
  API -- "gửi push" --> Expo
  Expo -- "thông báo" --> App
```

**Nguyên tắc chung**

- **Database là nguồn sự thật duy nhất.** WebSocket chỉ để báo "có thay đổi"; app luôn có thể gọi REST để lấy lại trạng thái đúng.
- **Không tin giá từ app.** App gửi lên *món + số lượng + tùy chọn*, server tự tính tiền từ database.
- **Thanh toán chỉ được xác nhận qua webhook của Stripe**, không dựa vào việc app báo "đã trả xong".
- **Tiền lưu bằng số nguyên** theo đơn vị nhỏ nhất của tiền tệ. VND không có số lẻ (Stripe coi là zero-decimal),
  nên `45000` nghĩa là 45.000 ₫. Không dùng kiểu float cho tiền.

## Data model

```mermaid
erDiagram
  users ||--o{ oauth_accounts : "đăng nhập qua"
  users ||--o{ refresh_tokens : "có phiên"
  users ||--o{ push_tokens : "có thiết bị"
  users ||--o{ orders : "đặt"
  users ||--o| conversations : "có (khách)"
  users ||--o{ messages : "gửi"

  stores ||--o{ orders : "nhận"
  categories ||--o{ products : "chứa"
  products ||--o{ option_groups : "có"
  option_groups ||--o{ options : "gồm"

  orders ||--|{ order_items : "gồm"
  order_items ||--o{ order_item_options : "chọn"
  orders ||--o{ order_status_history : "lịch sử"
  orders ||--o{ payments : "thanh toán (chưa làm)"
  conversations ||--o{ messages : "gồm"

  users {
    uuid id PK
    string email UK
    string password_hash "null nếu chỉ dùng Google"
    string full_name
    string phone
    string avatar_url
    enum role "customer | staff | admin"
    timestamp created_at
    timestamp updated_at
  }
  oauth_accounts {
    uuid id PK
    uuid user_id FK
    enum provider "google"
    string provider_user_id "UK cùng provider"
  }
  refresh_tokens {
    uuid id PK
    uuid user_id FK
    string token_hash "chỉ lưu hash"
    string device_name
    timestamp expires_at
    timestamp revoked_at
  }
  push_tokens {
    uuid id PK
    uuid user_id FK
    string token UK "ExponentPushToken[...]"
    enum platform "ios | android"
    timestamp updated_at
  }
  stores {
    uuid id PK
    string name
    string address
    float latitude
    float longitude
    string phone
    string image_url
    jsonb opening_hours "mon..sun: {open, close} hoặc null"
    boolean is_active
  }
  categories {
    uuid id PK
    string name
    string slug UK
    string image_url
    int sort_order
  }
  products {
    uuid id PK
    uuid category_id FK
    string name
    text description
    string image_url
    int base_price "VND"
    boolean is_available
    int sort_order
  }
  option_groups {
    uuid id PK
    uuid product_id FK
    string name "Size, Topping, Đường..."
    int min_select
    int max_select
    int sort_order
  }
  options {
    uuid id PK
    uuid option_group_id FK
    string name
    int price_delta "VND, có thể 0"
    boolean is_available
    int sort_order
  }
  orders {
    uuid id PK
    int number UK "tự tăng; code = BRW-(1000+number)"
    uuid user_id FK
    uuid store_id FK
    enum status
    int subtotal
    int total
    string currency "vnd"
    text note
    timestamp created_at
    timestamp updated_at
  }
  order_items {
    uuid id PK
    uuid order_id FK
    uuid product_id FK "null nếu món bị xóa"
    string product_name "snapshot"
    string product_image_url "snapshot"
    int unit_price "snapshot, đã cộng tùy chọn"
    int quantity
    int line_total
  }
  order_item_options {
    uuid id PK
    uuid order_item_id FK
    uuid option_id FK "null nếu bị xóa"
    string group_name "snapshot, vd Size"
    string option_name "snapshot, vd L"
    int price_delta "snapshot"
  }
  order_status_history {
    uuid id PK
    uuid order_id FK
    enum from_status
    enum to_status
    uuid changed_by_id FK "null nếu do hệ thống"
    timestamp created_at
  }
  payments {
    uuid id PK
    uuid order_id FK
    string stripe_payment_intent_id UK
    int amount
    string currency
    enum status
    timestamp created_at
    timestamp updated_at
  }
  stripe_events {
    string id PK "event id của Stripe"
    string type
    timestamp processed_at
  }
  conversations {
    uuid id PK
    uuid customer_id FK "UK: mỗi khách một cuộc chat"
    timestamp last_message_at "sắp xếp danh sách ở admin"
    timestamp customer_last_read_at
    timestamp staff_last_read_at
    timestamp created_at
  }
  messages {
    uuid id PK
    uuid conversation_id FK
    uuid sender_id FK "khách hoặc nhân viên"
    text body
    uuid client_id "do app tạo; UK cùng sender_id"
    timestamp created_at
  }
```

### Giải thích các quyết định

| Quyết định | Lý do |
|---|---|
| **Giỏ hàng không lưu ở server** | Giỏ hàng nằm trong app (Zustand + MMKV). Server chỉ nhận dữ liệu lúc tạo đơn, nên bớt được bảng và API. |
| **Snapshot tên và giá trong `order_items`, `order_item_options`** | Quán đổi giá hoặc xóa món thì đơn cũ vẫn phải hiển thị đúng như lúc khách mua. |
| **`refresh_tokens` chỉ lưu hash** | Lộ database cũng không dùng được token. Mỗi thiết bị một dòng, nên "đăng xuất thiết bị khác" chỉ cần đặt `revoked_at`. |
| **`oauth_accounts` tách khỏi `users`** | Một người có thể vừa đăng nhập bằng email vừa bằng Apple/Google. |
| **`payments` tách khỏi `orders`** | Một đơn có thể thanh toán lỗi rồi thử lại, tức là nhiều PaymentIntent cho một đơn. |
| **`stripe_events`** | Stripe có thể gửi cùng một webhook nhiều lần. Lưu `event.id` đã xử lý để không xử lý trùng. |
| **`push_tokens`** | Push notification là cách duy nhất báo cho khách khi **app đã tắt hoặc chạy nền**; lúc đó WebSocket không còn kết nối. Để gửi push, server cần Expo push token của **từng thiết bị** (app lấy bằng `getExpoPushTokenAsync()` rồi gửi lên). Một user có thể đăng nhập nhiều máy nên là bảng riêng, không phải một cột trong `users`. Xóa token khi đăng xuất hoặc khi Expo báo `DeviceNotRegistered`. |
| **Chat giữa khách và quán, không gắn với đơn** | Mỗi khách có **một** `conversations` với phía quán, nhân viên/admin nào cũng trả lời được. Tách `conversations` khỏi `messages` để admin có danh sách cuộc chat (sắp theo `last_message_at`) và đếm tin chưa đọc. |
| **`messages.client_id`** | App tự tạo một UUID cho mỗi tin trước khi gửi. Gửi lại (vì mất mạng, không nhận được ack) với cùng `clientId` sẽ trả về tin đã lưu thay vì tạo tin trùng; app cũng dùng nó để khớp "bong bóng" đang gửi với tin thật. |
| **Đã đọc lưu ở `conversations`, không ở từng tin** | So `created_at` của tin với `customer_last_read_at` / `staff_last_read_at` là biết tin nào chưa đọc, không phải cập nhật từng dòng `messages`. |
| **`order_status_history`** | Hiển thị timeline cho khách và biết nhân viên nào đổi trạng thái. |
| **`orders.number` tự tăng, `code` tính ra** | Postgres tự cấp số không trùng; `code` (BRW-1001) chỉ là cách hiển thị nên không cần lưu. |
| **Xóa món không làm hỏng đơn cũ** | `order_items.product_id` và `order_item_options.option_id` thành null khi món/tùy chọn bị xóa; tên và giá đã được copy sẵn. |
| **Cửa hàng không bao giờ bị xóa** | Đơn hàng tham chiếu tới cửa hàng; muốn ngừng thì đặt `is_active = false`. |

### Trạng thái đơn hàng

```mermaid
stateDiagram-v2
  [*] --> pending_payment : tạo đơn
  pending_payment --> paid : webhook payment_intent.succeeded
  pending_payment --> cancelled : khách hủy / quá 15 phút (job mỗi phút)
  paid --> accepted : quán nhận đơn
  paid --> cancelled : quán từ chối (hoàn tiền)
  accepted --> preparing
  preparing --> ready : báo khách đến lấy (push)
  ready --> completed : khách đã nhận
  completed --> [*]
  cancelled --> [*]
```

Ai được đổi trạng thái nào được định nghĩa ở `backend/src/orders/order-status.ts` (có unit test).
Chưa có Stripe nên dùng tạm `POST /api/dev/orders/:id/mark-paid` để chuyển sang `paid` (tắt khi `NODE_ENV=production`).

Trạng thái thanh toán (`payments.status`, sẽ làm cùng Stripe) bám theo Stripe: `requires_payment_method`, `processing`, `succeeded`, `failed`, `refunded`.

## Data flow

### 1. Đăng nhập và làm mới token

```mermaid
sequenceDiagram
  autonumber
  participant App
  participant API
  participant DB

  App->>API: POST /api/auth/login {email, password}
  API->>DB: tìm user, so sánh password_hash
  API->>DB: lưu refresh_token (hash)
  API-->>App: accessToken (JWT ~15 phút) + refreshToken (~30 ngày)
  Note over App: lưu cả hai vào expo-secure-store

  App->>API: GET /api/... (Authorization: Bearer accessToken)
  API-->>App: 401 khi accessToken hết hạn
  App->>API: POST /api/auth/refresh {refreshToken}
  API->>DB: kiểm tra hash, revoke token cũ, lưu token mới
  API-->>App: accessToken + refreshToken mới
  App->>API: gửi lại request ban đầu
```

- Refresh token **xoay vòng**: mỗi lần refresh, token cũ bị thu hồi. Nếu một token đã thu hồi bị dùng lại
  (dấu hiệu bị đánh cắp), server **đăng xuất user khỏi mọi thiết bị**. Vì vậy app chỉ được gửi **một** request refresh
  tại một thời điểm; các request khác bị 401 phải chờ lần refresh đó xong.
- Role nằm trong access token, nên khi admin đổi role của ai đó, thay đổi có hiệu lực ở lần refresh kế tiếp (tối đa 15 phút).

### 1b. Đăng nhập bằng Google

```mermaid
sequenceDiagram
  autonumber
  participant App
  participant Google
  participant API
  participant DB

  App->>Google: Google Sign-In
  Google-->>App: idToken
  App->>API: POST /api/auth/google {idToken}
  API->>Google: xác minh chữ ký, hạn dùng, audience ∈ GOOGLE_CLIENT_IDS
  API->>DB: tìm oauth_accounts (google, sub)
  alt chưa có
    API->>DB: có user cùng email? có thì liên kết, không thì tạo user mới
  end
  API-->>App: accessToken + refreshToken (như đăng nhập thường)
```

Chỉ chấp nhận email Google đã xác minh. Cấu hình: [google-sign-in.md](google-sign-in.md).

### 2. Xem menu

```mermaid
sequenceDiagram
  participant App
  participant API
  participant DB

  App->>API: GET /api/menu
  API->>DB: categories + products
  API-->>App: menu (JSON)
  Note over App: TanStack Query cache, kéo để làm mới
  App->>API: GET /api/products/:id (khi mở chi tiết món)
  API-->>App: product + option_groups + options
```

Món hết hàng vẫn được trả về với `isAvailable: false` để app hiển thị "Hết hàng".

### 3. Đặt món và thanh toán Stripe

```mermaid
sequenceDiagram
  autonumber
  participant App
  participant API
  participant DB
  participant Stripe

  App->>API: POST /api/orders {storeId, items[{productId, quantity, optionIds}]}
  API->>DB: đọc giá hiện tại, kiểm tra món còn bán, tính total
  API->>DB: tạo order (pending_payment) + order_items
  API->>Stripe: tạo PaymentIntent {amount: total, currency: vnd, metadata.orderId}
  API->>DB: tạo payment (requires_payment_method)
  API-->>App: {orderId, clientSecret}

  App->>Stripe: PaymentSheet (thẻ / Apple Pay / Google Pay)
  Stripe-->>App: kết quả trên giao diện
  Note over App: chuyển sang màn hình theo dõi đơn,<br/>chưa coi là "đã trả" cho tới khi server xác nhận

  Stripe->>API: webhook payment_intent.succeeded
  API->>API: xác minh chữ ký webhook
  API->>DB: đã có stripe_events.id? có thì bỏ qua
  API->>DB: payment = succeeded, order = paid, ghi history, lưu stripe_events
  API-->>App: WebSocket order:updated {status: paid}
```

Secret key của Stripe chỉ nằm trong `backend/.env`. App chỉ có publishable key và `clientSecret` của từng đơn.

### 4. Cập nhật trạng thái đơn theo thời gian thực

```mermaid
sequenceDiagram
  autonumber
  participant App as App (khách)
  participant Admin as Admin (quán)
  participant API
  participant DB
  participant Push as Expo Push

  App->>API: kết nối WebSocket (gửi accessToken)
  API->>API: xác thực, cho vào room user:{userId}
  Admin->>API: kết nối WebSocket, vào room user:{id} và staff

  Admin->>API: PATCH /api/admin/orders/:id/status {status: preparing}
  API->>DB: kiểm tra chuyển trạng thái hợp lệ, cập nhật, ghi history
  API-->>App: emit order:updated tới room user:{userId}
  API-->>Admin: emit order:updated tới room staff

  Admin->>API: PATCH /api/admin/orders/:id/status {status: ready}
  API->>DB: cập nhật
  API-->>App: emit order:updated
  API->>Push: gửi "Đơn của bạn đã sẵn sàng" tới push_tokens của user
```

Push gửi cho khách khi đơn sang `accepted`, `ready`, `cancelled` (trừ khi chính khách hủy); gửi cho nhân viên khi có đơn `paid`.

Khi app **mất kết nối** hoặc **quay lại từ nền**: kết nối lại WebSocket, rồi gọi `GET /api/orders/:id` để lấy trạng thái
mới nhất, vì có thể đã bỏ lỡ event trong lúc mất kết nối.

### 5. Chat giữa khách và quán

```mermaid
sequenceDiagram
  autonumber
  participant App as App (khách)
  participant API
  participant DB
  participant Admin as Admin (nhân viên)

  Note over App,Admin: Khách ở room user:{userId}, mọi nhân viên ở room staff

  App->>API: GET /api/chat/messages?before=...
  API->>DB: tìm (hoặc tạo) conversation của khách
  API-->>App: lịch sử tin nhắn (phân trang)

  App->>API: WebSocket message:send {body}
  API->>DB: lưu message, cập nhật last_message_at
  API-->>App: emit message:new (xác nhận đã lưu)
  API-->>Admin: emit message:new tới room staff
  API->>API: nhân viên nào không có socket đang mở thì gửi push

  Admin->>API: GET /api/admin/conversations
  API-->>Admin: danh sách cuộc chat + số tin chưa đọc
  Admin->>API: WebSocket message:send {conversationId, body}
  API->>API: kiểm tra role là staff/admin
  API->>DB: lưu message
  API-->>App: emit message:new tới room user:{customerId}
  API-->>Admin: emit message:new tới room staff

  App->>API: WebSocket conversation:read
  API->>DB: customer_last_read_at = now()
  API-->>Admin: emit conversation:read (cập nhật badge chưa đọc)
```

Gửi tin được cả qua WebSocket (`message:send`) lẫn REST (`POST /api/chat/messages`,
`POST /api/admin/conversations/:id/messages`); cả hai đều phát `message:new`. Tin nhắn trả về **mới nhất trước** (hợp với `FlatList inverted`),
trang sau lấy bằng `?before=<id tin cũ nhất đang có>`.

Khách không cần gửi `conversationId`: server tự lấy cuộc chat của user đang đăng nhập,
nên khách không thể đọc hay gửi vào cuộc chat của người khác.

## WebSocket

Code: `backend/src/realtime/` (kết nối, room, kiểu dữ liệu của event) và `backend/src/chat/chat.gateway.ts`.
Kiểu TypeScript của mọi event nằm ở `backend/src/realtime/realtime.events.ts`; app và admin web nên dùng đúng các kiểu này.

### Kết nối

```ts
import { io } from 'socket.io-client';

const socket = io('http://192.168.0.13:3100', {
  transports: ['websocket'],
  // Hàm, để mỗi lần (re)connect đều lấy access token mới nhất.
  auth: (cb) => cb({ token: getAccessToken() }),
});
```

- Không có tiền tố `/api`; đường dẫn mặc định của Socket.IO là `/socket.io`.
- Token sai hoặc thiếu: client nhận `connect_error` với `message` là `Missing access token` hoặc
  `Invalid or expired access token`. Khi đó refresh token rồi `socket.connect()` lại.
- Sau khi kết nối, server tự cho socket vào room `user:{id}`; staff/admin vào thêm room `staff`.
- **Khi access token hết hạn**, server gửi `session:expired` rồi ngắt kết nối. Socket.IO **không tự kết nối lại**
  sau khi server chủ động ngắt, nên app phải refresh token rồi gọi `socket.connect()`.
- **Sau mỗi lần kết nối lại**, gọi REST để lấy lại dữ liệu đang hiển thị (đơn, tin nhắn), vì event phát ra trong lúc
  mất kết nối sẽ không được gửi lại.

### Server gửi cho client

| Event | Gửi tới | Khi nào | Dữ liệu |
|---|---|---|---|
| `order:updated` | chủ đơn + `staff` | Mỗi lần đơn đổi trạng thái (sau khi đã lưu vào DB) | `{ orderId, code, userId, storeId, status, previousStatus, changedAt }` |
| `message:new` | khách của cuộc chat + `staff` | Mỗi tin nhắn mới, gửi qua WebSocket hay REST đều có | `{ conversationId, customerId, message }` |
| `conversation:read` | khách của cuộc chat + `staff` | Khách hoặc nhân viên đánh dấu đã đọc, hoặc nhân viên trả lời | `{ conversationId, customerId, reader: 'customer' \| 'staff', readAt }` |
| `session:expired` | socket đó | Access token hết hạn, ngay trước khi ngắt kết nối | không có |

`message` có dạng `{ id, clientId, conversationId, senderId, sender: { id, fullName, avatarUrl, role }, body, createdAt }`,
giống hệt REST. `sender` không bao giờ chứa email hay số điện thoại. Mọi thời gian là chuỗi ISO 8601.

Người gửi cũng nhận `message:new` cho chính tin của mình (để các thiết bị khác của họ cập nhật).
App bỏ qua event nếu đã có tin cùng `id` hoặc cùng `clientId`.

### Client gửi cho server

Dùng `emitWithAck`; kết quả luôn có dạng `{ ok: true, data }` hoặc `{ ok: false, error: { status, message } }`
với `status` giống HTTP (400 dữ liệu sai, 404 không tìm thấy, 409 xung đột, 429 gửi quá nhanh).

| Event | Ai gửi | Dữ liệu | `data` trả về |
|---|---|---|---|
| `message:send` | khách | `{ body, clientId? }` | tin nhắn đã lưu |
| `message:send` | nhân viên | `{ conversationId, body, clientId? }` | tin nhắn đã lưu |
| `conversation:read` | khách | `{}` | `null` |
| `conversation:read` | nhân viên | `{ conversationId }` | `null` |

```ts
const clientId = crypto.randomUUID();
const res = await socket.timeout(5000).emitWithAck('message:send', { body, clientId });
if (!res.ok) showError(res.error.message);
// Hết 5 giây không có ack: gửi lại với CÙNG clientId (qua socket hoặc POST /api/chat/messages), không tạo tin trùng.
```

Giới hạn mỗi user: 10 `message:send` và 20 `conversation:read` trong 10 giây.

### Push và WebSocket

- Chat: chỉ gửi push cho người **không có socket nào đang mở**; người đang mở app đã nhận qua WebSocket.
- Đơn hàng: luôn gửi push (đơn sẵn sàng là thông báo quan trọng, kể cả khi app vừa chuyển nền).

### Giới hạn hiện tại

Room nằm trong bộ nhớ của tiến trình backend. Chạy nhiều instance backend phía sau load balancer thì cần thêm
Socket.IO Redis adapter, nếu không event chỉ tới được socket kết nối vào cùng instance.

## Endpoint

Danh sách đầy đủ, kèm schema và nút "Try it out": **http://localhost:3100/api/docs** (Swagger, khi chạy backend).

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Health | `GET /api/health` | công khai |
| Auth | `POST /api/auth/register`, `/login`, `/google`, `/refresh`, `/logout` | công khai |
| Tôi | `GET` `PATCH /api/me`, `PUT /api/me/password`, `POST /api/me/avatar`, `POST /api/me/push-tokens`, `DELETE /api/me/push-tokens/:token` | đã đăng nhập |
| Cửa hàng | `GET /api/stores`, `GET /api/stores/:id` | công khai |
| Menu | `GET /api/menu`, `GET /api/products/:id` | công khai |
| Đơn | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel` | đã đăng nhập |
| Chat | `GET /api/chat`, `GET` `POST /api/chat/messages`, `POST /api/chat/read` | customer |
| Admin: đơn | `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status` | staff, admin |
| Admin: chat | `GET /api/admin/conversations`, `GET` `POST /api/admin/conversations/:id/messages`, `POST /api/admin/conversations/:id/read` | staff, admin |
| Admin: menu | `/api/admin/categories`, `/api/admin/products` (+ `/:id/image`, `/:id/option-groups`), `/api/admin/option-groups/:id` (+ `/options`), `/api/admin/options/:id` | admin |
| Admin: cửa hàng | `GET` `POST /api/admin/stores`, `PATCH /api/admin/stores/:id` | admin |
| Admin: user | `GET /api/admin/users`, `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id/role` | admin |
| Dev | `POST /api/dev/orders/:id/mark-paid` (thay webhook Stripe khi chưa có) | chủ đơn hoặc staff |
| Stripe | `POST /api/webhooks/stripe` | **chưa làm** |

WebSocket: xem mục [WebSocket](#websocket) ở trên.
