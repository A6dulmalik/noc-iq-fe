import axios, { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, TOKEN_KEY, REFRESH_KEY } from './api';

describe('api authentication recovery', () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    vi.restoreAllMocks();
  });

  it('refreshes only once and logs out when the retried request is still unauthorized', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(REFRESH_KEY, 'refresh-token');

    const adapter = vi.fn<AxiosAdapter>(async (config) => {
      const response = {
        data: {},
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      };
      throw new AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        response
      );
    });
    api.defaults.adapter = adapter;

    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'fresh-token', refresh_token: 'new-refresh' },
    });
    const logout = vi.fn();
    window.addEventListener('auth:logout', logout);

    try {
      await expect(api.get('/protected')).rejects.toMatchObject({
        status: 401,
      });
    } finally {
      window.removeEventListener('auth:logout', logout);
    }

    expect(adapter).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
