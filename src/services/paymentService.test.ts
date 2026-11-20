import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: { get, post },
}));

import {
  fetchPayment,
  fetchPaymentHistory,
  fetchPayments,
  normalizePayment,
  retryPayment,
} from './paymentService';

describe('payment service response mapping (#965)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('maps snake_case list payloads, including the transactions alias', async () => {
    get.mockResolvedValueOnce({
      data: {
        total: 1,
        page: 2,
        page_size: 5,
        transactions: [
          {
            id: 'pay-1',
            outage_id: 'out-1',
            type: 'penalty',
            amount_usdc: 12.5,
            asset_code: 'USDC',
            tx_hash: 'tx-hash',
            client_wallet: 'GCLIENT',
            artist_wallet: 'GARTIST',
            status: 'confirmed',
            created_at: '2026-11-01T10:00:00Z',
            reconciliation_status: 'matched',
          },
        ],
      },
    });

    const result = await fetchPayments({ page: 2, page_size: 5 });

    expect(get).toHaveBeenCalledWith('/payments', {
      params: { page: 2, page_size: 5 },
    });
    expect(result).toMatchObject({ total: 1, page: 2, page_size: 5 });
    expect(result.items[0]).toMatchObject({
      id: 'pay-1',
      outageId: 'out-1',
      amount: '12.50',
      amountValue: 12.5,
      assetCode: 'USDC',
      transactionHash: 'tx-hash',
      clientWallet: 'GCLIENT',
      artistWallet: 'GARTIST',
      status: 'confirmed',
      reconciliationStatus: 'matched',
    });
  });

  it('maps camelCase detail payloads and fills safe defaults', async () => {
    get.mockResolvedValueOnce({
      data: {
        id: 'pay-2',
        amountUsdc: 7,
        assetCode: 'XLM',
        status: 'pending',
        createdAt: '2026-11-02T10:00:00Z',
      },
    });

    const payment = await fetchPayment('pay-2');

    expect(get).toHaveBeenCalledWith('/payments/pay-2', {
      signal: undefined,
    });
    expect(payment).toMatchObject({
      id: 'pay-2',
      amount: '7.00',
      amountValue: 7,
      assetCode: 'XLM',
      status: 'pending',
      createdAt: '2026-11-02T10:00:00Z',
    });
    expect(payment.outageId).toBeNull();
  });

  it('maps retry responses and keeps field aliases consistent', async () => {
    post.mockResolvedValueOnce({
      data: {
        id: 'pay-3',
        amount: '3.25',
        asset: 'USDC',
        transactionHash: 'retry-hash',
        status: 'RELEASED',
      },
    });

    const updated = await retryPayment('pay-3', { note: 'retry' });

    expect(post).toHaveBeenCalledWith('/payments/pay-3/retry', {
      note: 'retry',
    });
    expect(updated).toMatchObject({
      assetCode: 'USDC',
      transactionHash: 'retry-hash',
      status: 'RELEASED',
    });
  });

  it('propagates API errors unchanged for list, detail and retry', async () => {
    get.mockRejectedValue(new Error('list offline'));
    await expect(fetchPayments()).rejects.toThrow('list offline');

    get.mockRejectedValue(new Error('detail offline'));
    await expect(fetchPayment('pay-4')).rejects.toThrow('detail offline');

    post.mockRejectedValue(new Error('retry offline'));
    await expect(retryPayment('pay-4')).rejects.toThrow('retry offline');
  });

  it('normalizes history entries and filters unrelated ids', async () => {
    get.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'event-1',
            payment_id: 'pay-5',
            from_status: 'pending',
            to_status: 'confirmed',
            created_at: '2026-11-03T10:00:00Z',
            reason: 'settled',
          },
          {
            id: 'event-2',
            payment_id: 'other',
            metadata: { transaction_hash: 'unrelated' },
            timestamp: '2026-11-03T11:00:00Z',
          },
        ],
      },
    });

    const history = await fetchPaymentHistory({
      id: 'pay-5',
      outageId: null,
      transactionHash: 'tx-5',
    });

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: 'event-1',
      paymentId: 'pay-5',
      previousStatus: 'pending',
      status: 'confirmed',
      note: 'settled',
    });
  });

  it('normalizes non-object and missing values without throwing', () => {
    expect(normalizePayment(null)).toMatchObject({
      id: '',
      amount: '0.00',
      amountValue: 0,
      assetCode: 'USDC',
      status: 'pending',
    });
  });
});
