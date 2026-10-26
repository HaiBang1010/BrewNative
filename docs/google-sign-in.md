# Đăng nhập bằng Google

Backend đã làm xong (`POST /api/auth/google`). Chỉ còn thiếu **Client ID** của Google.
Khi chưa cấu hình, endpoint trả về `503 Google sign-in is not configured`.

## Cách hoạt động

App mở Google Sign-In, Google trả về **ID token** (một JWT có email, tên, ảnh). App gửi ID token lên backend.
Backend kiểm tra chữ ký của Google, hạn dùng, và **audience** (token được cấp cho đúng app của mình),
rồi tìm hoặc tạo user. Backend **không cần client secret**, chỉ cần danh sách Client ID.

## 1. Tạo Client ID trên Google Cloud Console

Vào https://console.cloud.google.com, tạo (hoặc chọn) một project, rồi:

1. **Cấu hình màn hình đồng ý (OAuth consent screen / Branding)**: tên app "Brew", email hỗ trợ.
   Khi còn ở chế độ *Testing*, thêm email Google của bạn vào **Test users**.
2. Vào **APIs & Services → Credentials → Create credentials → OAuth client ID** và tạo **3** client:

| Loại (Application type) | Điền | Dùng để |
|---|---|---|
| **Web application** | Tên bất kỳ, không cần redirect URI | App truyền vào thư viện Google Sign-In dưới tên `webClientId`. ID token trả về có audience là ID này |
| **iOS** | Bundle ID: `com.brew.reactnative` | Google Sign-In trên iPhone |
| **Android** | Package name: `com.brew.reactnative` và **SHA-1** của chứng chỉ ký app | Google Sign-In trên Android |

Bundle ID và package name lấy từ [mobile/app.json](../mobile/app.json); nếu đổi ở đó thì phải đổi ở Google.

**Lấy SHA-1 cho Android**

- Bản dev build trên máy (`npx expo run:android`): dùng debug keystore
  ```sh
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep SHA1
  ```
- Bản build bằng EAS: `eas credentials`, chọn Android, xem SHA-1 của keystore.
- Bản phát hành trên Google Play: Play Console → App integrity → **App signing key certificate** → SHA-1.

Mỗi SHA-1 khác nhau cần một Android client riêng (hoặc thêm vào cùng client nếu Console cho phép).

## 2. Đưa vào backend

Trong `backend/.env`, ghi tất cả Client ID, cách nhau bằng dấu phẩy, không có khoảng trắng thừa:

```sh
GOOGLE_CLIENT_IDS=1234-web.apps.googleusercontent.com,1234-ios.apps.googleusercontent.com,1234-android.apps.googleusercontent.com
```

Khởi động lại backend. Gọi thử `POST /api/auth/google` với `idToken` sai: kết quả phải là `401 Invalid Google ID token`
(không còn là 503) là đã nhận cấu hình.

Client ID không phải bí mật (nó nằm cả trong app), nhưng vẫn để trong `.env` cho dễ đổi theo môi trường.

## 3. Phía app (làm khi tới phần mobile)

- Dùng thư viện Google Sign-In cho React Native, cấu hình `webClientId` (Web client ID) và `iosClientId`.
- Thư viện này có code native, nên **không chạy trên Expo Go**, phải dùng development build.
- Sau khi đăng nhập, lấy `idToken` và gọi:
  ```http
  POST /api/auth/google
  { "idToken": "<idToken>", "deviceName": "iPhone của Bang" }
  ```
  Kết quả giống hệt đăng nhập email: `accessToken`, `refreshToken`, `user`.

## Quy tắc liên kết tài khoản

| Tình huống | Kết quả |
|---|---|
| Tài khoản Google này đã đăng nhập trước đó | Đăng nhập vào đúng user đó |
| Chưa từng đăng nhập Google, nhưng đã có user đăng ký bằng **cùng email** | Liên kết Google vào user đó |
| Chưa có user nào với email này | Tạo user mới (không có mật khẩu), lấy tên và ảnh từ Google |
| Email Google chưa được xác minh | Từ chối (401) |

User tạo từ Google có thể đặt mật khẩu sau bằng `PUT /api/me/password` (không cần `currentPassword`).
