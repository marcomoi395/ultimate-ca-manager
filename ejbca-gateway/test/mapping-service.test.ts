import { describe, expect, it } from 'bun:test';
import { MappingService } from '../src/mappings/mapping.service';

describe('MappingService', () => {
  it('returns explicit unmapped status when no mapping exists', () => {
    const service = new MappingService({ find: () => undefined });
    expect(service.resolve('certificate', 'missing').status).toBe('MISSING');
  });
});
