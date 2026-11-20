'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ReplayResult {
  success: boolean;
  message: string;
}

export function useWebhookReplay() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const { data } = await api.post<ReplayResult>(
        `/webhooks/deliveries/${deliveryId}/replay`
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['webhooks'] });
      void qc.invalidateQueries({ queryKey: ['webhook-deliveries'] });
    },
    onError: () => {
      // A replay can fail because the subscription was deleted in another
      // session. Refresh both collections so a stale row cannot linger with a
      // false pending state; the table shows the recoverable message.
      void qc.invalidateQueries({ queryKey: ['webhooks'] });
      void qc.invalidateQueries({ queryKey: ['webhook-deliveries'] });
    },
  });
}
