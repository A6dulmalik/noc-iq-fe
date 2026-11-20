import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import SessionExpiryModal from './SessionExpiryModal';

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open expiry dialog
      </button>
      <SessionExpiryModal
        isOpen={isOpen}
        pendingMutations={[]}
        onReauthenticated={() => undefined}
        onDismiss={() => setIsOpen(false)}
      />
    </>
  );
}

describe('SessionExpiryModal focus management', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('moves focus into the dialog and restores it to the opener on close', async () => {
    render(<ModalHarness />);
    const opener = screen.getByRole('button', { name: 'Open expiry dialog' });
    opener.focus();
    fireEvent.click(opener);

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveFocus();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(opener).toHaveFocus());
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('uses the main landmark when the opener no longer exists', async () => {
    function FallbackHarness() {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <>
          <main id="main-content" tabIndex={-1} />
          <button type="button" onClick={() => setIsOpen(false)}>
            Close from session flow
          </button>
          <SessionExpiryModal
            isOpen={isOpen}
            pendingMutations={[]}
            onReauthenticated={() => undefined}
            onDismiss={() => setIsOpen(false)}
          />
        </>
      );
    }

    render(<FallbackHarness />);
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());

    fireEvent.click(
      screen.getByRole('button', { name: 'Close from session flow' })
    );

    await waitFor(() =>
      expect(document.getElementById('main-content')).toHaveFocus()
    );
  });
});
