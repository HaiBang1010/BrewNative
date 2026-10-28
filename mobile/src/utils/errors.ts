import { ApiError } from './api-error';

/** Vietnamese text for the backend messages a user is likely to see. */
const KNOWN_MESSAGES: Record<string, string> = {
  'Email or password is incorrect': 'Email hoặc mật khẩu không đúng',
  'Email is already registered': 'Email này đã được đăng ký',
  'Invalid Google ID token': 'Đăng nhập Google không hợp lệ, thử lại nhé',
  'Google email is not verified': 'Email Google chưa được xác minh',
  'Payment already received': 'Đơn đã được thanh toán, đang chờ xác nhận',
  'Payment is already being processed': 'Thanh toán đang được xử lý, vui lòng đợi',
  'Order is not awaiting payment': 'Đơn này không còn chờ thanh toán',
  'A payment for this order is already being processed':
    'Đơn đang được thanh toán nên không hủy được',
  'Category still has products; move or delete them first':
    'Danh mục còn món: chuyển các món sang danh mục khác hoặc xoá chúng trước',
  'Only JPEG, PNG, WebP or HEIC images are allowed': 'Chỉ nhận ảnh JPEG, PNG, WebP hoặc HEIC',
  'File too large': 'Ảnh quá lớn, chọn ảnh nhỏ hơn 5 MB',
  'Forbidden resource': 'Tài khoản của bạn không có quyền làm việc này',
};

/** A message to show the user for any thrown error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Bạn thao tác nhanh quá, đợi một chút rồi thử lại';
    if (error.status >= 500) return 'Máy chủ đang gặp sự cố, thử lại sau';
    // A category's slug comes from its name: "Trà" and "Tra" clash.
    if (/^Slug ".*" is already used$/.test(error.message)) return 'Đã có danh mục trùng tên này';
    return KNOWN_MESSAGES[error.message] ?? error.messages.join('\n');
  }
  // fetch() throws a TypeError when the server can't be reached at all.
  if (error instanceof TypeError) {
    return 'Không kết nối được máy chủ. Kiểm tra mạng và backend đang chạy.';
  }
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra';
}
