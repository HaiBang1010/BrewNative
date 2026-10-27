/**
 * Reads the payload of a JWT without verifying it. Only for showing the right
 * screens (e.g. the role); the backend verifies every token it receives, so a
 * tampered token gets the user nothing.
 */
export function decodeJwtPayload<T>(token: string): T | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as T;
  } catch {
    return null;
  }
}
