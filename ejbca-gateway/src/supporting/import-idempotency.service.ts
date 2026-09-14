export type IdempotencyClaim =
  | { status: 'CLAIMED' }
  | { status: 'REPLAY' }
  | { status: 'CONFLICT' };

export class ImportIdempotencyService {
  private readonly hashes = new Map<string, string>();

  claim(key: string, requestHash: string): IdempotencyClaim {
    const existing = this.hashes.get(key);
    if (!existing) {
      this.hashes.set(key, requestHash);
      return { status: 'CLAIMED' };
    }
    return existing === requestHash ? { status: 'REPLAY' } : { status: 'CONFLICT' };
  }
}
