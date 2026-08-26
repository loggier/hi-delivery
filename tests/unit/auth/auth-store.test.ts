import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_STORAGE_KEY, useAuthStore } from '@/store/auth-store';

describe('auth store logout', () => {
  const removeItem = vi.fn();
  const fetchMock = vi.fn(() => new Promise<Response>(() => {}));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', { removeItem });
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.setState({
      user: { id: 'visual-user' } as never,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('clears local state immediately and sends a best-effort keepalive request', () => {
    useAuthStore.getState().logout();

    expect(removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/sign-out', {
      method: 'POST',
      keepalive: true,
    });
  });
});
