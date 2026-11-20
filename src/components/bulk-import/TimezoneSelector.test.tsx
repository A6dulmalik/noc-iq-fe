import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimezoneSelector } from './TimezoneSelector';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('TimezoneSelector', () => {
  it('shows the chosen UTC instant and offset for a repeated local time', () => {
    vi.stubEnv('TZ', 'America/New_York');
    render(
      <TimezoneSelector
        value="Local"
        onChange={vi.fn()}
        sampleTimestamps={['2026-11-01T01:15:00']}
      />
    );

    expect(screen.getByText('2026-11-01T05:15:00.000Z')).toBeInTheDocument();
    expect(
      screen.getByText(/Repeated local time; using the earlier occurrence/)
    ).toHaveTextContent('UTC−04:00');
  });
});
