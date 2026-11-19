import { describe, expect, it } from 'vitest';

import {
  checkDestinationSafety,
  getSafeExternalUrl,
  isLoopbackHostname,
} from './destinationSafety';

describe('checkDestinationSafety', () => {
  it('accepts a public HTTPS destination', () => {
    expect(checkDestinationSafety('https://example.com/hook', []).safe).toBe(
      true
    );
    expect(getSafeExternalUrl('https://example.com/tx/1')).toBe(
      'https://example.com/tx/1'
    );
  });

  it('rejects credentials without exposing their values', () => {
    const result = checkDestinationSafety(
      'https://alice:private-token@example.com/hook',
      []
    );

    expect(result.safe).toBe(false);
    expect(result.url).not.toContain('private-token');
    expect(result.warnings.map((warning) => warning.message).join(' ')).not.toContain(
      'private-token'
    );
    expect(getSafeExternalUrl('https://alice:private-token@example.com')).toBe(
      null
    );
  });

  it('rejects canonical and encoded loopback host forms', () => {
    for (const url of [
      'https://localhost/hook',
      'https://127.0.0.1/hook',
      'https://127.1/hook',
      'https://[::1]/hook',
      'https://%31%32%37.0.0.1/hook',
    ]) {
      expect(checkDestinationSafety(url, []).safe).toBe(false);
    }

    expect(isLoopbackHostname('%6cocalhost')).toBe(true);
  });
});
