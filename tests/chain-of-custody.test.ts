import { describe, expect, it } from 'vitest';

import { digestEvidenceManifest } from '@/lib/chainOfCustody';

describe('digestEvidenceManifest', () => {
  it('produces the same digest when entries are supplied in a different order', async () => {
    const first = [
      { id: 'evidence-b', content: 'second file' },
      { id: 'evidence-a', content: 'first file' },
    ];
    const reordered = [...first].reverse();

    await expect(digestEvidenceManifest(reordered)).resolves.toBe(
      await digestEvidenceManifest(first)
    );
  });

  it('changes when evidence content or its identifier changes', async () => {
    const entry = { id: 'evidence-a', content: 'original bytes' };
    const digest = await digestEvidenceManifest([entry]);

    await expect(
      digestEvidenceManifest([{ ...entry, content: 'changed bytes' }])
    ).resolves.not.toBe(digest);
    await expect(
      digestEvidenceManifest([{ ...entry, id: 'evidence-b' }])
    ).resolves.not.toBe(digest);
  });
});
