import type { MappingRecord } from '../persistence/store';

export function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolveMapping(records: readonly MappingRecord[], resourceType: string, ucmId: string): MappingRecord | undefined {
  const matches = records.filter((record) => record.resourceType === resourceType && record.ucmId === ucmId);
  return matches.length === 1 ? matches[0] : undefined;
}
