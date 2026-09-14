import { Database } from 'bun:sqlite';
import type { MappingRecord } from './store';

export class SqliteGatewayStore {
  private readonly database: Database;

  constructor(filename = ':memory:') {
    this.database = new Database(filename);
    this.database.run(`
      CREATE TABLE IF NOT EXISTS gateway_mappings (
        resource_type TEXT NOT NULL,
        ucm_id TEXT NOT NULL,
        canonical_id TEXT NOT NULL,
        status TEXT NOT NULL,
        PRIMARY KEY (resource_type, ucm_id)
      )
    `);
  }

  save(record: MappingRecord): void {
    this.database.query(`
      INSERT INTO gateway_mappings (resource_type, ucm_id, canonical_id, status)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(resource_type, ucm_id) DO UPDATE SET canonical_id = excluded.canonical_id, status = excluded.status
    `).run(record.resourceType, record.ucmId, record.canonicalId, record.status);
  }

  find(resourceType: string, ucmId: string): MappingRecord | undefined {
    return this.database.query(`
      SELECT resource_type AS resourceType, ucm_id AS ucmId, canonical_id AS canonicalId, status
      FROM gateway_mappings WHERE resource_type = ? AND ucm_id = ?
    `).get(resourceType, ucmId) as MappingRecord | undefined;
  }

  close(): void {
    this.database.close();
  }
}
