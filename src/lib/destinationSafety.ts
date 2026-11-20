export type DestinationSafetyWarning = {
  type:
    | 'duplicate_url'
    | 'unreachable'
    | 'self_cert'
    | 'rate_limited'
    | 'no_tls'
    | 'credentials';
  message: string;
  severity: 'warning' | 'error';
};

export type SafetyCheckResult = {
  url: string;
  safe: boolean;
  warnings: DestinationSafetyWarning[];
};

function decodeHostname(hostname: string): string {
  let decoded = hostname;
  for (let attempt = 0; attempt < 5 && decoded.includes('%'); attempt++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded.toLowerCase().replace(/\.+$/, '');
}

export function isLoopbackHostname(hostname: string): boolean {
  const host = decodeHostname(hostname).replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (/^127(?:\.\d{1,3}){0,3}$/.test(host)) return true;
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  return /^::ffff:127(?:\.\d{1,3}){0,3}$/.test(host);
}

function redactCredentials(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export function checkDestinationSafety(
  url: string,
  existingUrls: string[]
): SafetyCheckResult {
  const warnings: DestinationSafetyWarning[] = [];
  let parsed: URL | null = null;

  try {
    parsed = new URL(url);
  } catch {
    warnings.push({
      type: 'unreachable',
      message: 'URL is malformed and cannot be reached.',
      severity: 'error',
    });
  }

  const resultUrl = parsed && (parsed.username || parsed.password)
    ? redactCredentials(url)
    : url;

  if (existingUrls.includes(url)) {
    warnings.push({
      type: 'duplicate_url',
      message: 'This URL is already registered as a webhook destination',
      severity: 'warning',
    });
  }

  if (parsed && parsed.protocol !== 'https:') {
    warnings.push({
      type: 'no_tls',
      message:
        'URL does not use HTTPS. Webhook data will be sent in plaintext.',
      severity: 'error',
    });
  }

  if (parsed?.username || parsed?.password) {
    warnings.push({
      type: 'credentials',
      message: 'Destination URLs must not contain embedded credentials.',
      severity: 'error',
    });
  }

  if (parsed && isLoopbackHostname(parsed.hostname)) {
    warnings.push({
      type: 'self_cert',
      message: 'Destination must not point to a loopback host.',
      severity: 'error',
    });
  }

  return {
    url: resultUrl,
    safe: warnings.every((warning) => warning.severity !== 'error'),
    warnings,
  };
}

export function getSafeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const result = checkDestinationSafety(url, []);
  return result.safe ? result.url : null;
}

export function getSafetySummary(results: SafetyCheckResult[]): {
  total: number;
  safe: number;
  warnings: number;
  errors: number;
} {
  const safe = results.filter((r) => r.safe).length;
  const errors = results.filter((r) =>
    r.warnings.some((w) => w.severity === 'error')
  ).length;
  const warnings = results.filter((r) =>
    r.warnings.some((w) => w.severity === 'warning')
  ).length;
  return { total: results.length, safe, warnings, errors };
}
