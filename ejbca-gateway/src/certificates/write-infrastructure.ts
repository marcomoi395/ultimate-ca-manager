import { ConflictException } from '@nestjs/common';

export type WriteClaim =
  | { status: 'CLAIMED' }
  | { status: 'REPLAY'; response: unknown }
  | { status: 'CONFLICT' };

export interface WriteAuditRecord {
  actor_id: string;
  action: string;
  correlation_id: string;
  outcome: string;
  metadata: Record<string, string>;
}

export class CertificateWriteInfrastructure {
  private readonly claims = new Map<string, { hash: string; response?: unknown }>();
  readonly audits: WriteAuditRecord[] = [];

  claim(key: string | undefined, hash: string): WriteClaim {
    if (!key) return { status: 'CLAIMED' };
    const existing = this.claims.get(key);
    if (!existing) {
      this.claims.set(key, { hash });
      return { status: 'CLAIMED' };
    }
    if (existing.hash !== hash) return { status: 'CONFLICT' };
    if (existing.response !== undefined) return { status: 'REPLAY', response: existing.response };
    return { status: 'CONFLICT' };
  }

  saveResponse(key: string | undefined, response: unknown): void {
    if (!key) return;
    const claim = this.claims.get(key);
    if (claim) claim.response = response;
  }

  conflict(): never {
    throw new ConflictException('Idempotency key conflicts with a different request');
  }

  audit(record: Omit<WriteAuditRecord, 'metadata'> & { metadata: Record<string, unknown> }): void {
    const metadata = Object.fromEntries(
      Object.entries(record.metadata)
        .filter(([key]) => !/(password|token|secret|private.?key|csr|certificate|body)/i.test(key))
        .map(([key, value]) => [key, String(value)]),
    );
    this.audits.push({ ...record, metadata });
  }
}
