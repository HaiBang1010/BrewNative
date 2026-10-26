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

```
mobile/
├── src/
│   ├── app/              # (sẽ tạo khi cài Expo Router) mỗi file là một màn hình/route
│   ├── components/       # Component dùng lại được
│   │   └── ui/           # Component cơ bản: Button, Input, Card...
│   ├── hooks/            # Custom hook: useAuth, useDebounce...
│   ├── lib/              # API client, socket client, hàm tiện ích
│   ├── stores/           # State toàn cục (Zustand): cart, auth...
│   ├── constants/        # Màu, kích thước, cấu hình
│   └── types/            # Type TypeScript dùng chung
├── assets/               # Icon, splash, font, ảnh tĩnh
├── App.tsx               # Màn hình gốc (sẽ bỏ khi chuyển sang Expo Router)
├── index.ts              # Điểm khởi chạy app
├── app.json              # Cấu hình Expo: tên app, icon, bundle id, plugin
├── package.json
└── tsconfig.json
```

### Quy ước

- **`src/app/` chỉ chứa màn hình.** Logic và UI phức tạp tách ra `components/`, `hooks/`, `lib/`.
  Expo Router coi mọi file trong `app/` là một route, nên đừng đặt component hay helper vào đó.
- **Component dùng ở một màn hình** thì đặt cạnh màn hình đó hoặc trong `components/<tên-tính-năng>/`.
  Component dùng ở nhiều nơi thì đặt trong `components/ui/`.
- **Không hardcode màu và kích thước** trong component; lấy từ `constants/` (hoặc theme của NativeWind).
- **Không gọi `fetch` trực tiếp trong màn hình**; gọi qua `lib/` (và TanStack Query).
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
