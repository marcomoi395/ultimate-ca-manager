import { describe, expect, it } from 'bun:test';
import { createGatewaySchema } from '../src/persistence/schema';

describe('gateway schema', () => {
  it('creates mapping, projection, audit, and idempotency tables', () => {
    const database = createGatewaySchema(':memory:');
    const tables = database.query("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
    expect(tables).toEqual(expect.arrayContaining(['gateway_mappings', 'gateway_projections', 'gateway_audit', 'gateway_idempotency']));
    database.close();
  });
});
