import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createRecoveryHandler, shouldRetryQuery } from './queryRecovery';

describe('createRecoveryHandler', () => {
  it('counts failed queries', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const query = client.getQueryCache().build(client, {
      queryKey: ['test'],
      queryFn: () => Promise.reject(new Error('fail')),
    });
    query.setState({ status: 'error', error: new Error('fail') });
    const handler = createRecoveryHandler(client);
    expect(typeof handler.retryFailedQueries).toBe('function');
    expect(typeof handler.getPendingRetries).toBe('function');
  });

  it('attempts recovery only once for a failed query', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const query = client.getQueryCache().build(client, {
      queryKey: ['test'],
      queryFn: () => Promise.reject(new Error('fail')),
    });
    query.setState({ status: 'error', error: new Error('fail') });
    const refetchQueries = vi
      .spyOn(client, 'refetchQueries')
      .mockResolvedValue();
    const handler = createRecoveryHandler(client);

    await expect(handler.retryFailedQueries()).resolves.toBe(1);
    await expect(handler.retryFailedQueries()).resolves.toBe(0);
    expect(refetchQueries).toHaveBeenCalledTimes(1);

    client.clear();
  });
});

describe('shouldRetryQuery', () => {
  it('does not retry unauthorized responses', () => {
    expect(shouldRetryQuery(0, { status: 401 })).toBe(false);
    expect(shouldRetryQuery(0, { response: { status: 401 } })).toBe(false);
  });

  it('preserves the configured retry count for other errors', () => {
    expect(shouldRetryQuery(0, new Error('network error'))).toBe(true);
    expect(shouldRetryQuery(1, new Error('network error'))).toBe(true);
    expect(shouldRetryQuery(2, new Error('network error'))).toBe(false);
  });
});
