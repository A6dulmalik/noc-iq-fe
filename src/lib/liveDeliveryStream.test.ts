import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addDeliveryEntry,
  buildContinuationUrl,
  createLiveDeliveryStream,
  createStreamState,
  type LiveDeliveryEvent,
} from './liveDeliveryStream';

class MemoryStorage {
  values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(cursor: string, data = '{}') {
    this.onmessage?.({ lastEventId: cursor, data } as MessageEvent<string>);
  }

  fail() {
    this.onerror?.(new Event('error'));
  }
}

afterEach(() => {
  vi.useRealTimers();
  FakeEventSource.instances = [];
});

describe('liveDeliveryStream', () => {
  it('resumes after the stored cursor and ignores replayed events', async () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    storage.setItem('cursor', 'event-1');
    const onEvent = vi.fn<(event: LiveDeliveryEvent) => void>();
    const stream = createLiveDeliveryStream({
      url: '/api/deliveries?status=failed',
      storage,
      storageKey: 'cursor',
      onEvent,
      eventSourceFactory: (url) => new FakeEventSource(url),
    });

    expect(FakeEventSource.instances[0].url).toBe(
      '/api/deliveries?status=failed&after=event-1'
    );

    FakeEventSource.instances[0].emit('event-2', '{"id":"delivery-2"}');
    await Promise.resolve();
    await Promise.resolve();
    expect(storage.getItem('cursor')).toBe('event-2');

    FakeEventSource.instances[0].fail();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(FakeEventSource.instances[1].url).toBe(
      '/api/deliveries?status=failed&after=event-2'
    );

    FakeEventSource.instances[1].emit('event-2', '{"id":"delivery-2"}');
    FakeEventSource.instances[1].emit('event-3', '{"id":"delivery-3"}');
    await Promise.resolve();
    await Promise.resolve();

    expect(onEvent.mock.calls.map(([event]) => event.cursor)).toEqual([
      'event-2',
      'event-3',
    ]);
    expect(stream.getState().lastAcknowledgedCursor).toBe('event-3');
    stream.stop();
  });

  it('does not acknowledge an event until its handler succeeds', async () => {
    vi.useFakeTimers();
    const storage = new MemoryStorage();
    storage.setItem('cursor', 'event-1');
    let reportFailure!: (error: Error) => void;
    const failureReported = new Promise<Error>((resolve) => {
      reportFailure = resolve;
    });
    const onEvent = vi.fn().mockRejectedValueOnce(new Error('handler failed'));
    const stream = createLiveDeliveryStream({
      url: '/api/deliveries',
      storage,
      storageKey: 'cursor',
      onEvent,
      onError: reportFailure,
      eventSourceFactory: (url) => new FakeEventSource(url),
    });

    FakeEventSource.instances[0].emit('event-2');
    await failureReported;

    expect(storage.getItem('cursor')).toBe('event-1');
    expect(stream.getState().error).toBe('handler failed');
    stream.stop();
  });

  it('de-duplicates entries without disturbing timestamp order', () => {
    const first = {
      id: 'delivery-1',
      webhookId: 'webhook-1',
      timestamp: '2026-01-02T00:00:00Z',
      status: 'delivered' as const,
      latencyMs: 10,
      attempt: 1,
    };
    const second = { ...first, id: 'delivery-2', timestamp: '2026-01-01T00:00:00Z' };
    const state = addDeliveryEntry(
      addDeliveryEntry(createStreamState(), first),
      second
    );

    expect(addDeliveryEntry(state, first)).toBe(state);
    expect(state.entries.map((entry) => entry.id)).toEqual([
      'delivery-2',
      'delivery-1',
    ]);
  });

  it('adds a continuation cursor without dropping existing parameters', () => {
    expect(buildContinuationUrl('https://api.example/events?keep=1', 'a b')).toBe(
      'https://api.example/events?keep=1&after=a+b'
    );
  });
});
