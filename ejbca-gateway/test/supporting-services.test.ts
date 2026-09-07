import { describe, expect, it } from 'bun:test';
import { ImportService } from '../src/supporting/import.service';
import { HsmService } from '../src/supporting/hsm.service';

describe('supporting services', () => {
  it('blocks import execution until a side-effect adapter is configured', async () => {
    expect((await new ImportService().execute({})).data.status).toBe('blocked');
  });

  it('returns metadata-only HSM discovery data', async () => {
    expect((await new HsmService().providers()).data).toEqual([]);
  });
});
