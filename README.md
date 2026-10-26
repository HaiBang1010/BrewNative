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
npm install   # lần đầu
npm start
```

## Chạy backend

Xem [backend/README.md](backend/README.md).

Xem thêm trong [docs/](docs/README.md).
