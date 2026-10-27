import { ApiError } from './api';

/** Vietnamese text for the backend messages a user is likely to see. */
const KNOWN_MESSAGES: Record<string, string> = {
  'Email or password is incorrect': 'Email hoặc mật khẩu không đúng',
  'Email is already registered': 'Email này đã được đăng ký',
  'Invalid Google ID token': 'Đăng nhập Google không hợp lệ, thử lại nhé',
  'Google email is not verified': 'Email Google chưa được xác minh',
};

/** A message to show the user for any thrown error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Bạn thao tác nhanh quá, đợi một chút rồi thử lại';
    if (error.status >= 500) return 'Máy chủ đang gặp sự cố, thử lại sau';
    return KNOWN_MESSAGES[error.message] ?? error.messages.join('\n');
  }
  // fetch() throws a TypeError when the server can't be reached at all.
  if (error instanceof TypeError) {
    return 'Không kết nối được máy chủ. Kiểm tra mạng và backend đang chạy.';
  }
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
}
