import type { User } from '@/types/api';
import { api } from './session';

/** /me endpoints: the signed-in user's own account. */
export const userService = {
  getMe: (signal?: AbortSignal) => api.get<User>('/me', { signal }),
};
