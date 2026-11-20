export type ContractFieldDefinition = {
  type: string;
  required?: boolean;
};

export type ContractField = string | ContractFieldDefinition;
export type ContractFields = Record<string, ContractField>;

export type ContractDriftWarning = {
  endpoint: string;
  expectedType: string;
  actualType: string;
  field: string;
  change: 'added' | 'removed' | 'type_changed';
  severity: 'info' | 'warning' | 'error';
};

export type DriftReport = {
  adminMessage: string;
  warnings: ContractDriftWarning[];
  criticalCount: number;
};

function getExpectedField(field: ContractField): ContractFieldDefinition {
  return typeof field === 'string' ? { type: field } : field;
}

function getActualFieldType(field: unknown): string {
  if (
    field !== null &&
    typeof field === 'object' &&
    'type' in field &&
    typeof field.type === 'string'
  ) {
    return field.type;
  }
  return typeof field;
}

export function detectContractDrift(
  expected: ContractFields,
  actual: Record<string, unknown>
): ContractDriftWarning[] {
  const warnings: ContractDriftWarning[] = [];

  for (const [field, expectedDefinition] of Object.entries(expected)) {
    const definition = getExpectedField(expectedDefinition);
    if (!(field in actual)) {
      if (definition.required === false) continue;
      warnings.push({
        endpoint: 'unknown',
        field,
        expectedType: definition.type,
        actualType: 'missing',
        change: 'removed',
        severity: 'error',
      });
      continue;
    }

    const actualType = getActualFieldType(actual[field]);
    if (
      actualType !== definition.type &&
      !(actual[field] === null && definition.type === 'string')
    ) {
      warnings.push({
        endpoint: 'unknown',
        field,
        expectedType: definition.type,
        actualType,
        change: 'type_changed',
        severity:
          definition.type === 'string' && actualType === 'number'
            ? 'warning'
            : 'error',
      });
    }
  }

  for (const [field, actualDefinition] of Object.entries(actual)) {
    if (field in expected) continue;
    warnings.push({
      endpoint: 'unknown',
      field,
      expectedType: 'absent',
      actualType: getActualFieldType(actualDefinition),
      change: 'added',
      severity: 'info',
    });
  }

  return warnings;
}

export function buildDriftReport(
  endpoint: string,
  expected: ContractFields,
  actual: Record<string, unknown>
): DriftReport {
  const warnings = detectContractDrift(expected, actual).map((warning) => ({
    ...warning,
    endpoint,
  }));
  const critical = warnings.filter((warning) => warning.severity === 'error').length;
  return {
    adminMessage: `Contract drift detected on ${endpoint}: ${warnings.length} field(s) changed`,
    warnings,
    criticalCount: critical,
  };
}

export function formatDriftForAdminPanel(report: DriftReport): string[] {
  return report.warnings.map(
    (warning) =>
      `[${warning.severity.toUpperCase()}] ${warning.endpoint}.${warning.field}: expected ${warning.expectedType}, got ${warning.actualType}`
  );
}
