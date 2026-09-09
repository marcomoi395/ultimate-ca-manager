import type { Database } from 'bun:sqlite';
import { createGatewaySchema } from './schema';

export class GatewayWriteInfrastructure {
  private readonly database: Database;

  constructor(database = createGatewaySchema()) {
    this.database = database;
  }

  claim(key: string, requestHash: string): 'CLAIMED' | 'REPLAY' | 'CONFLICT' {
    const existing = this.database.query('SELECT request_hash FROM gateway_idempotency WHERE key = ?').get(key) as { request_hash: string } | null;
    if (existing) return existing.request_hash === requestHash ? 'REPLAY' : 'CONFLICT';
    this.database.query('INSERT INTO gateway_idempotency (key, request_hash, state) VALUES (?, ?, ?)').run(key, requestHash, 'CLAIMED');
    return 'CLAIMED';
  }

  audit(actorId: string, action: string, correlationId: string, metadata: Record<string, unknown>): void {
    const safe = Object.fromEntries(Object.entries(metadata).filter(([key]) => !/(password|token|secret|private.?key|csr|certificate)/i.test(key)));
    this.database.query('INSERT INTO gateway_audit (actor_id, action, correlation_id, metadata) VALUES (?, ?, ?, ?)').run(actorId, action, correlationId, JSON.stringify(safe));
  }
}
