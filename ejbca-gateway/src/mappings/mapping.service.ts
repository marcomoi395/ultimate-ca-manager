import type { MappingRecord } from '../persistence/store';

export interface MappingReader {
  find(resourceType: string, ucmId: string): MappingRecord | undefined;
}

export type MappingResolution =
  | { status: 'MATCHED'; record: MappingRecord }
  | { status: 'MISSING' };

export class MappingService {
  constructor(private readonly reader: MappingReader) {}

  resolve(resourceType: string, ucmId: string): MappingResolution {
    const record = this.reader.find(resourceType, ucmId);
    if (!record) return { status: 'MISSING' };
    return { status: 'MATCHED', record };
  }
}
