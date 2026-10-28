# Phát hành Brew

Hiện tại: **bản thử APK** cài thẳng lên điện thoại Android, backend miễn phí trên **Render**, database trên **Neon**,
Stripe chế độ **test**. Không lên Google Play. Phần cuối là những gì cần thêm khi lên store.

## Chi phí

| Khoản | Giá | Ghi chú |
|---|---|---|
| EAS Build gói Free | 0 USD | Tối đa 15 bản Android + 15 bản iOS (theo expo.dev/pricing), hàng chờ ưu tiên thấp, mỗi bản tối đa 45 phút |
| Build trên máy mình (`--local`) | 0 USD | Không tốn lượt build; cần Android SDK trên máy |
| Render (web service Free) | 0 USD | Giới hạn bên dưới |
| Neon (Postgres Free) | 0 USD | 0,5 GB, không hết hạn |
| Expo Push, Firebase Cloud Messaging | 0 USD | Expo giới hạn 600 thông báo/giây |
| Stripe test | 0 USD | Thẻ test `4242 4242 4242 4242`, không có tiền thật |
| Google Play Console | 25 USD, một lần | Chỉ khi lên Google Play |
| Apple Developer Program | 99 USD/năm | Chỉ khi làm iOS (push, TestFlight, App Store) |

## Giới hạn của bản miễn phí

- **Render ngủ sau 15 phút** không có request; lần gọi đầu sau đó mất khoảng 1 phút. Lúc ngủ, việc chạy định kỳ
  (huỷ đơn chưa thanh toán quá hạn...) cũng dừng.
- **Ổ đĩa Render bị xoá** mỗi lần deploy, khởi động lại hoặc ngủ: **ảnh món admin upload sẽ mất** (đã chấp nhận).
  Ảnh 4 món cà phê trong `backend/seed-images/` được seed chép lại mỗi lần khởi động nên không mất.
- **Không có Shell trên Render Free**: migration và seed tự chạy mỗi lần khởi động (`npm run start:render`).
  Seed chạy lại nhiều lần vẫn an toàn; ở production chỉ tạo tài khoản admin, không tạo tài khoản demo.

## 1. Database trên Neon

1. Tạo tài khoản ở neon.tech → **Create project** → region **AWS Asia Pacific (Singapore)** (gần Render Singapore).
2. **Connect** → chép **Connection string** dạng `postgresql://…@…neon.tech/neondb?sslmode=require`.
   Đây là bí mật (có mật khẩu database): không commit, không gửi cho ai.

## 2. Backend trên Render

1. Đẩy repo lên GitHub (Render lấy code từ đó).
2. Render dashboard → **New → Blueprint** → chọn repo. Render đọc `render.yaml` ở thư mục gốc và hỏi các biến:

   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | Connection string của Neon |
   | `GOOGLE_CLIENT_IDS` | 3 client ID (web, iOS, Android), cách nhau bằng dấu phẩy, giống `backend/.env` |
   | `STRIPE_SECRET_KEY` | `sk_test_…` |
   | `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |
   | `SEED_ADMIN_EMAIL` | Email tài khoản admin |
   | `SEED_ADMIN_PASSWORD` | Mật khẩu mạnh, **không** dùng mật khẩu mặc định trong README |

   `JWT_ACCESS_SECRET` do Render tự sinh, `PUBLIC_URL` tự lấy địa chỉ `https://….onrender.com`.
3. Đợi deploy xong, mở `https://<tên-service>.onrender.com/api/health` phải thấy `"status":"ok"`.
   Lần đầu khởi động sẽ tạo bảng, menu mẫu, 2 cửa hàng và tài khoản admin.

## 3. Biến môi trường của app trên EAS

`mobile/.env` không được commit nên EAS không có. Đặt cho môi trường `preview` (profile `preview` trong `eas.json`),
chạy trong `mobile/`:
```bash
npx eas-cli env:set preview --name EXPO_PUBLIC_API_URL --value https://<tên-service>.onrender.com/api --visibility plaintext
npx eas-cli env:set preview --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value pk_test_... --visibility plaintext
npx eas-cli env:set preview --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value ... --visibility plaintext
npx eas-cli env:set preview --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value ... --visibility plaintext
npx eas-cli env:set preview --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value ... --visibility plaintext
npx eas-cli env:list preview   # kiểm tra
```
Các biến `EXPO_PUBLIC_*` nằm trong app nên ai cũng đọc được: chỉ đặt giá trị công khai. `mobile/.env` vẫn giữ IP
mạng nhà để chạy dev, không đụng tới.

## 4. Build APK

```bash
cd mobile
npx eas-cli build -p android --profile preview
```
- Lần đầu EAS hỏi tạo keystore: chọn để EAS tạo và giữ. **Đừng xoá keystore trên Expo**: mất nó thì sau này
  không cập nhật được app đã cài.
- Build xong có link và mã QR: mở trên điện thoại để tải APK, cho phép "cài ứng dụng không rõ nguồn" rồi cài.
- Mỗi lần build tốn 1 lượt miễn phí. Không muốn tốn lượt: thêm `--local` (build bằng Android SDK trên máy).

## 5. Đăng nhập Google trên APK

APK ký bằng keystore của EAS, không phải keystore debug, nên Google sẽ báo `DEVELOPER_ERROR` cho tới khi khai báo:
1. `npx eas-cli credentials -p android` → profile `preview` → xem **SHA1 Fingerprint** của keystore.
2. Google Cloud Console → APIs & Services → Credentials → OAuth client loại **Android** → thêm một client
   (hoặc SHA-1) với package `com.brew.reactnative` và SHA-1 vừa lấy.

## 6. Thử trên điện thoại

Đăng ký / đăng nhập (email và Google), xem menu và ảnh, đặt món và thanh toán bằng thẻ test, push khi quán đổi
trạng thái đơn (app ở nền), chat realtime, tắt mạng, mở lại app sau 1 giờ (splash). Lần đầu mở sau khi Render ngủ
sẽ chờ khoảng 1 phút.

## Khi lên store sau này

- **Mã định danh** `com.brew.reactnative` không đổi được sau khi lên store: muốn đổi thì đổi trước bản đầu tiên
  (kéo theo Firebase, credentials Expo, Google Cloud).
- Build `--profile production` ra file AAB; đặt biến cho môi trường `production` giống bước 3 (Stripe `pk_live_`).
- Backend trả phí (không ngủ, ổ đĩa giữ lại) hoặc chuyển ảnh upload sang S3 / R2; Stripe live và webhook.
- Google Play: 25 USD, cần chính sách quyền riêng tư, ảnh chụp màn hình. Thêm SHA-1 của **Google Play App Signing**
  vào Google Cloud. Các bản sau nộp bằng `npx eas-cli submit -p android`.
- iOS: Apple Developer 99 USD/năm, khoá APNs (`npx eas-cli credentials -p ios`), `npx eas-cli build -p ios`.
- Sửa JS nhỏ có thể đẩy qua EAS Update thay vì build lại (chưa cài: cần `expo-updates` và `eas update:configure`).
