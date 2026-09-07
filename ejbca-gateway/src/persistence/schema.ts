import { Database } from 'bun:sqlite';

export function createGatewaySchema(filename = ':memory:'): Database {
  const database = new Database(filename);
  database.run(`
    CREATE TABLE IF NOT EXISTS gateway_mappings (
      resource_type TEXT NOT NULL,
      ucm_id TEXT NOT NULL,
      canonical_id TEXT NOT NULL,
      status TEXT NOT NULL,
      mapping_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (resource_type, ucm_id),
      UNIQUE (resource_type, canonical_id)
    );
    CREATE TABLE IF NOT EXISTS gateway_projections (
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      comparison_status TEXT NOT NULL,
      correlation_id TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (resource_type, resource_id)
    );
    CREATE TABLE IF NOT EXISTS gateway_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS gateway_idempotency (
      key TEXT PRIMARY KEY,
      request_hash TEXT NOT NULL,
      state TEXT NOT NULL,
      response TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return database;
}
