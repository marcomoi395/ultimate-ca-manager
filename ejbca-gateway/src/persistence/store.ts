export interface MappingRecord {
  resourceType: string;
  ucmId: string;
  canonicalId: string;
  status: 'MATCHED' | 'MISSING' | 'DUPLICATE' | 'DRIFTED' | 'UNVERIFIED';
}

export class GatewayStore {
  private readonly records = new Map<string, MappingRecord>();

  save(record: MappingRecord): void {
    this.records.set(`${record.resourceType}:${record.ucmId}`, record);
  }

  find(resourceType: string, ucmId: string): MappingRecord | undefined {
    return this.records.get(`${resourceType}:${ucmId}`);
  }
}
