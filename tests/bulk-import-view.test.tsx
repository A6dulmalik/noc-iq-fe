import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BulkImportView from '@/components/bulk-import/bulk-import-view';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// The view navigates to the outage table from the import summary modal, so it
// needs the router stub every other router-dependent test in this repo uses.
const { mockRouterPush } = vi.hoisted(() => ({ mockRouterPush: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockBulkImport = vi.fn();
vi.mock('@/services/bulkImportService', () => ({
  bulkImportOutages: (...a: unknown[]) => mockBulkImport(...a),
}));

const validCsv = 'service_id,start_time,end_time\ns1,2026-01-01,2026-01-02';
const file = (name: string, content: string) =>
  new File([content], name, { type: 'text/csv' });

describe('BulkImportView', () => {
  beforeEach(() => mockBulkImport.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it('renders upload area with disabled button', () => {
    render(<BulkImportView />);
    expect(screen.getByText('Bulk Outage Import')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload file/i })).toBeDisabled();
  });

  it('rejects unsupported file types', async () => {
    render(<BulkImportView />);
    const input = document.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'data.txt', { type: 'text/plain' })] },
    });
    expect(await screen.findByText(/Invalid file type/)).toBeInTheDocument();
  });

  it('shows blocking errors for CSV missing required columns', async () => {
    render(<BulkImportView />);
    const input = document.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [file('bad.csv', 'name,value\nfoo,bar')] },
    });
    expect(
      await screen.findByText(/Missing required columns/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload file/i })).toBeDisabled();
  });

  it('shows success summary after valid upload', async () => {
    mockBulkImport.mockResolvedValue({ imported: 3, skipped: 1, errors: [] });
    render(<BulkImportView />);
    const input = document.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [file('data.csv', validCsv)] },
    });
    await screen.findByText('data.csv');
    fireEvent.click(screen.getByRole('button', { name: /upload file/i }));
    expect(await screen.findByText('Import Summary')).toBeInTheDocument();
    // The breakdown is asserted through the summary modal, which now also
    // reports the counts, so a bare getByText('3') would be ambiguous.
    expect(screen.getByTestId('import-summary-imported')).toHaveTextContent(
      '3'
    );
    expect(screen.getByTestId('import-summary-skipped')).toHaveTextContent('1');
  });

  it('shows server validation errors in summary', async () => {
    mockBulkImport.mockResolvedValue({
      imported: 0,
      skipped: 1,
      errors: [{ row: 2, message: 'Invalid date' }],
    });
    render(<BulkImportView />);
    const input = document.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [file('data.csv', validCsv)] },
    });
    await screen.findByText('data.csv');
    fireEvent.click(screen.getByRole('button', { name: /upload file/i }));
    expect(await screen.findByText('Invalid date')).toBeInTheDocument();
  });

  it('validates and uploads ambiguous local times using the selected instant', async () => {
    vi.stubEnv('TZ', 'America/New_York');
    mockBulkImport.mockResolvedValue({ imported: 1, skipped: 0, errors: [] });
    render(<BulkImportView />);
    const input = document.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          file(
            'fall-back.csv',
            'service_id,start_time,end_time\ns1,2026-11-01T01:15:00,2026-11-01T01:45:00'
          ),
        ],
      },
    });

    await screen.findByText('fall-back.csv');
    fireEvent.change(screen.getByLabelText('CSV source timezone'), {
      target: { value: 'Local' },
    });
    const ambiguityNotes = await screen.findAllByText(/Repeated local time/);
    expect(ambiguityNotes[0]).toHaveTextContent('2026-11-01T05:15:00.000Z');

    fireEvent.click(screen.getByRole('button', { name: /upload file/i }));
    await waitFor(() => expect(mockBulkImport).toHaveBeenCalled());

    const uploadedFile = mockBulkImport.mock.calls[0][0] as File;
    await expect(uploadedFile.text()).resolves.toContain(
      '2026-11-01T05:15:00.000Z,2026-11-01T05:45:00.000Z'
    );
  });
});
