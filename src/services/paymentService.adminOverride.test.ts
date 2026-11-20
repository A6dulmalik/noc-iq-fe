import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '@/lib/api';
import { adminOverridePayment } from './paymentService';

describe('adminOverridePayment (#488)', () => {
  it('posts max fee multiplier and admin password for re-authenticated override submission', async () => {
    const mockedPost = vi.mocked(api.post);
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 'pay_123',
        type: 'reward',
        amount: '10.00',
        amount_usdc: 10,
        asset_code: 'USDC',
        status: 'PENDING',
        created_at: '2026-11-20T12:00:00.000Z',
      },
    } as never);

    const result = await adminOverridePayment('pay_123', {
      maxFeeMultiplier: 1.75,
      adminPassword: 'secret-pass',
      note: 'operator note',
    });

    expect(mockedPost).toHaveBeenCalledWith('/payments/pay_123/override', {
      max_fee_multiplier: 1.75,
      admin_password: 'secret-pass',
      note: 'operator note',
    });
    expect(result.id).toBe('pay_123');
    expect(result.status).toBe('PENDING');
  });
});
