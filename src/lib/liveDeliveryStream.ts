export type DeliveryEntry = {
  id: string;
  webhookId: string;
  timestamp: string;
  status: 'queued' | 'in_flight' | 'delivered' | 'failed' | 'retrying';
  latencyMs: number;
  attempt: number;
};

export type StreamState = {
  isPolling: boolean;
  entries: DeliveryEntry[];
  backoffMs: number;
  error: string | null;
  lastAcknowledgedCursor: string | null;
};

export type LiveDeliveryEvent = {
  cursor: string;
  data: string;
};

type EventSourceLike = {
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  close: () => void;
};

export interface LiveDeliveryStreamOptions {
  url: string;
  onEvent: (event: LiveDeliveryEvent) => void | Promise<void>;
  onError?: (error: Error) => void;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  storageKey?: string;
  eventSourceFactory?: (url: string) => EventSourceLike;
}

export interface LiveDeliveryStream {
  getState: () => StreamState;
  stop: () => void;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export function createStreamState(
  lastAcknowledgedCursor: string | null = null
): StreamState {
  return {
    isPolling: false,
    entries: [],
    backoffMs: BASE_BACKOFF_MS,
    error: null,
    lastAcknowledgedCursor,
  };
}

export function calculateBackoff(
  currentBackoffMs: number,
  success: boolean
): number {
  if (success) return BASE_BACKOFF_MS;
  return Math.min(currentBackoffMs * 2, MAX_BACKOFF_MS);
}

export function addDeliveryEntry(
  state: StreamState,
  entry: DeliveryEntry
): StreamState {
  if (state.entries.some((existing) => existing.id === entry.id)) return state;

  return {
    ...state,
    entries: [...state.entries, entry].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    ),
  };
}

export function getStreamStats(entries: DeliveryEntry[]): {
  total: number;
  successRate: number;
  avgLatency: number;
} {
  const delivered = entries.filter((e) => e.status === 'delivered').length;
  return {
    total: entries.length,
    successRate:
      entries.length > 0 ? Math.round((delivered / entries.length) * 100) : 0,
    avgLatency:
      entries.length > 0
        ? Math.round(
            entries.reduce((s, e) => s + e.latencyMs, 0) / entries.length
          )
        : 0,
  };
}

export function buildContinuationUrl(url: string, cursor: string | null): string {
  if (!cursor) return url;

  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(url);
  const parsed = new URL(url, 'http://localhost');
  parsed.searchParams.set('after', cursor);
  return isAbsolute
    ? parsed.toString()
    : `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function getDefaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

export function createLiveDeliveryStream(
  options: LiveDeliveryStreamOptions
): LiveDeliveryStream {
  const storage = options.storage ?? getDefaultStorage();
  const storageKey = options.storageKey ?? `live-delivery-cursor:${options.url}`;
  const createEventSource =
    options.eventSourceFactory ??
    ((url: string) => new EventSource(url) as EventSourceLike);
  let state = createStreamState();
  let source: EventSourceLike | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let queue = Promise.resolve();
  const acknowledgedCursors = new Set<string>();

  const reportError = (reason: unknown) => {
    const error =
      reason instanceof Error ? reason : new Error(String(reason));
    state = { ...state, error: error.message };
    options.onError?.(error);
  };

  try {
    state = createStreamState(storage?.getItem(storageKey) ?? null);
    if (state.lastAcknowledgedCursor) {
      acknowledgedCursors.add(state.lastAcknowledgedCursor);
    }
  } catch (error) {
    reportError(error);
  }

  const scheduleReconnect = () => {
    if (stopped || retryTimer) return;
    const delay = state.backoffMs;
    state = {
      ...state,
      isPolling: false,
      backoffMs: calculateBackoff(state.backoffMs, false),
    };
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  };

  const connect = () => {
    if (stopped) return;

    try {
      source = createEventSource(
        buildContinuationUrl(options.url, state.lastAcknowledgedCursor)
      );
      state = { ...state, isPolling: true };
    } catch (error) {
      reportError(error);
      scheduleReconnect();
      return;
    }

    const currentSource = source;
    currentSource.onmessage = (message) => {
      const cursor = message.lastEventId;
      if (!cursor) {
        reportError(new Error('Live delivery event is missing its cursor.'));
        currentSource.close();
        scheduleReconnect();
        return;
      }
      if (acknowledgedCursors.has(cursor)) return;

      queue = queue.then(async () => {
        if (stopped) return;
        await options.onEvent({ cursor, data: message.data });
        if (storage) storage.setItem(storageKey, cursor);
        acknowledgedCursors.add(cursor);
        state = {
          ...state,
          lastAcknowledgedCursor: cursor,
          backoffMs: calculateBackoff(state.backoffMs, true),
          error: null,
        };
      }).catch((error: unknown) => {
        reportError(error);
        currentSource.close();
        scheduleReconnect();
      });
    };

    currentSource.onerror = () => {
      currentSource.close();
      scheduleReconnect();
    };
  };

  connect();

  return {
    getState: () => state,
    stop: () => {
      stopped = true;
      state = { ...state, isPolling: false };
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      source?.close();
      source = null;
    },
  };
}
