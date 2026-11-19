import { Query, QueryClient } from '@tanstack/react-query';

export function shouldRetryQuery(
  failureCount: number,
  error: unknown
): boolean {
  const errorDetails = error as {
    status?: number;
    response?: { status?: number };
  } | null;
  const status = errorDetails?.status ?? errorDetails?.response?.status;
  if (status === 401) {
    return false;
  }

  return failureCount < 2;
}

export function createRecoveryHandler(queryClient: QueryClient) {
  const attemptedQueries = new WeakSet<Query>();

  return {
    async retryFailedQueries() {
      const queries = queryClient.getQueryCache().getAll();
      const failed = queries.filter(
        (query) =>
          query.state.status === 'error' && !attemptedQueries.has(query)
      );
      failed.forEach((query) => attemptedQueries.add(query));

      await Promise.allSettled(
        failed.map((query) =>
          queryClient.refetchQueries({
            queryKey: query.queryKey,
            exact: true,
          })
        )
      );
      return failed.length;
    },
    getPendingRetries(): number {
      return queryClient
        .getQueryCache()
        .getAll()
        .filter(
          (query) =>
            query.state.status === 'error' && !attemptedQueries.has(query)
        ).length;
    },
  };
}
