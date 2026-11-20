import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from '../toast';

function Probe() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast('Saved successfully', 'success')}>
        success
      </button>
      <button onClick={() => toast('Save failed', 'error')}>error</button>
      <button onClick={() => toast('Duplicate event', 'info')}>
        duplicate
      </button>
    </div>
  );
}

describe('toast live region announcements (#937)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces success and error toasts politely', async () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );

    const announcer = screen.getByTestId('toast-announcer');
    expect(announcer).toHaveAttribute('role', 'status');
    expect(announcer).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(screen.getByRole('button', { name: 'success' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announcer).toHaveTextContent('Saved successfully');

    fireEvent.click(screen.getByRole('button', { name: 'error' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announcer).toHaveTextContent('Save failed');
  });

  it('avoids duplicate announcements for identical consecutive toasts', async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );

    const announcer = screen.getByTestId('toast-announcer');
    fireEvent.click(screen.getByRole('button', { name: 'duplicate' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announcer).toHaveTextContent('Duplicate event');

    // While the previous identical message is still the last announcement,
    // dispatching it again must not trigger a new announcement update.
    fireEvent.click(screen.getByRole('button', { name: 'duplicate' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announcer).toHaveTextContent('Duplicate event');

    // After the dedupe window resets, the same message can be announced again.
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'duplicate' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(announcer).toHaveTextContent('Duplicate event');
  });
});
