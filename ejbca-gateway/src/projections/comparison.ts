export type ProjectionStatus = 'MATCHED' | 'DRIFTED' | 'MISSING' | 'DUPLICATE' | 'UNVERIFIED';

export function compareProjection(local: unknown, upstream: unknown): ProjectionStatus {
  if (local === undefined || upstream === undefined) return 'MISSING';
  return JSON.stringify(local) === JSON.stringify(upstream) ? 'MATCHED' : 'DRIFTED';
}

export function nextMappingVersion(current: number, identityChanged: boolean): number {
  return identityChanged ? current + 1 : current;
}
