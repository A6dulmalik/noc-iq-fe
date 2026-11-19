export type CustodyNode = {
  id: string;
  type: 'outage' | 'sla' | 'payment';
  label: string;
  timestamp: string;
  details: Record<string, unknown>;
};

export type CustodyEdge = {
  from: string;
  to: string;
  label: string;
};

export type CustodyChain = {
  nodes: CustodyNode[];
  edges: CustodyEdge[];
};

export function canonicalizeEvidenceManifest<T extends { id: string }>(
  entries: readonly T[]
): T[] {
  return [...entries].sort((left, right) => {
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;

    const leftEntry = stableStringify(left);
    const rightEntry = stableStringify(right);
    if (leftEntry < rightEntry) return -1;
    if (leftEntry > rightEntry) return 1;
    return 0;
  });
}

export async function digestEvidenceManifest(
  entries: readonly { id: string }[]
): Promise<string> {
  const canonicalManifest = stableStringify(
    canonicalizeEvidenceManifest(entries)
  );
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalManifest)
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const entries = Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value) ?? 'null';
}

export function buildCustodyChain(
  outageId: string,
  slaResult: Record<string, unknown>,
  payment: Record<string, unknown> | null
): CustodyChain {
  const nodes: CustodyNode[] = [
    {
      id: `outage-${outageId}`,
      type: 'outage',
      label: `Outage ${outageId.slice(0, 8)}`,
      timestamp: String(slaResult.detected_at || ''),
      details: slaResult,
    },
    {
      id: `sla-${outageId}`,
      type: 'sla',
      label: `SLA Result`,
      timestamp: String(slaResult.calculated_at || ''),
      details: slaResult,
    },
  ];
  const edges: CustodyEdge[] = [
    {
      from: `outage-${outageId}`,
      to: `sla-${outageId}`,
      label: 'triggers SLA',
    },
  ];

  if (payment) {
    nodes.push({
      id: `payment-${outageId}`,
      type: 'payment',
      label: `Payment ${String(payment.transaction_hash || '').slice(0, 8)}`,
      timestamp: String(payment.created_at || ''),
      details: payment,
    });
    edges.push({
      from: `sla-${outageId}`,
      to: `payment-${outageId}`,
      label: 'generates payment',
    });
  }

  return { nodes, edges };
}

export function getChainSummary(chain: CustodyChain): {
  nodeCount: number;
  edgeCount: number;
  path: string;
} {
  const path = chain.nodes.map((n) => n.label).join(' → ');
  return { nodeCount: chain.nodes.length, edgeCount: chain.edges.length, path };
}
