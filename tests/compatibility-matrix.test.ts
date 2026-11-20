import { describe, it, expect } from 'vitest';
import { detectContractDrift, buildDriftReport } from '@/lib/contractDrift';
import { normalizeOutage, normalizePayment } from '@/lib/normalizers';
import backendContract from '../fixtures/backend-contract.json';

describe('Client Contract Compatibility Matrix', () => {
  const outageContract =
    backendContract.endpoints['/api/v1/outages'].response;

  it('detects no drift when shapes match', () => {
    const expected = { id: 'string', site_name: 'string', severity: 'string' };
    const actual = { id: '001', site_name: 'Site A', severity: 'critical' };
    expect(detectContractDrift(expected, actual)).toEqual([]);
  });

  it('detects type drift', () => {
    const expected = { id: 'string', amount: 'string' };
    const actual = { id: '001', amount: 500 };
    const warnings = detectContractDrift(expected, actual);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].field).toBe('amount');
  });

  it('generates drift report with severity counts', () => {
    const report = buildDriftReport(
      '/api/v1/outages',
      { id: 'string', amount: 'boolean' },
      { id: '001', amount: 500 }
    );
    expect(report.criticalCount).toBe(1);
    expect(report.warnings).toHaveLength(1);
  });

  it('reports an added optional response field as informational', () => {
    const report = buildDriftReport('/api/v1/outages', outageContract, {
      id: '001',
      site_name: 'Site A',
      severity: 'critical',
      new_optional_field: 'value',
    });

    expect(report.warnings).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/v1/outages',
        field: 'new_optional_field',
        change: 'added',
        severity: 'info',
      })
    );
    expect(report.criticalCount).toBe(0);
  });

  it('reports removed required fields as breaking drift', () => {
    const report = buildDriftReport('/api/v1/outages', outageContract, {
      id: '001',
      severity: 'critical',
    });

    expect(report.warnings).toContainEqual(
      expect.objectContaining({
        endpoint: '/api/v1/outages',
        field: 'site_name',
        actualType: 'missing',
        change: 'removed',
        severity: 'error',
      })
    );
    expect(report.criticalCount).toBe(1);
  });

  it('does not report missing optional fields and reports changed types', () => {
    const report = buildDriftReport('/api/v1/outages', outageContract, {
      id: '001',
      site_name: 'Site A',
      severity: 3,
    });

    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toMatchObject({
      endpoint: '/api/v1/outages',
      field: 'severity',
      expectedType: 'string',
      actualType: 'number',
      change: 'type_changed',
      severity: 'warning',
    });
  });

  it('normalizes outage to expected shape', () => {
    const normalized = normalizeOutage({
      id: '123',
      site_name: 'Site A',
      severity: 'high',
      status: 'open',
      detected_at: '2026-06-01T00:00:00Z',
    });
    expect(normalized.siteName).toBe('Site A');
    expect(normalized.severity).toBe('high');
  });

  it('normalizes payment with snake_case mapping', () => {
    const normalized = normalizePayment({
      id: 'p1',
      transaction_hash: '0xabc',
      amount: 500,
      asset_code: 'USDC',
      status: 'confirmed',
      created_at: '2026-06-01T00:00:00Z',
    });
    expect(normalized.transactionHash).toBe('0xabc');
    expect(normalized.assetCode).toBe('USDC');
  });

  it('handles null resolved_at in outage', () => {
    const normalized = normalizeOutage({
      id: '123',
      site_name: 'Site A',
      severity: 'medium',
      status: 'open',
      detected_at: '2026-06-01T00:00:00Z',
    });
    expect(normalized.resolvedAt).toBeNull();
  });
});
