import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SessionManagementCard } from '../SessionManagementCard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    state: 'authenticated',
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMutationToast', () => ({
  useMutationToast: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('SessionManagementCard empty state (#929)', () => {
  it('shows an informative empty state when no other sessions are active', () => {
    render(<SessionManagementCard otherSessions={[]} />);

    expect(
      screen.getByText('Only your current session is active')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'No other devices or browsers are signed in to this account.'
      )
    ).toBeInTheDocument();
  });

  it('hides the empty state when other sessions exist', () => {
    render(
      <SessionManagementCard
        otherSessions={[{ id: 'sess-2', label: 'Chrome on macOS' }]}
      />
    );

    expect(
      screen.queryByText('Only your current session is active')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Chrome on macOS')).toBeInTheDocument();
  });
});
