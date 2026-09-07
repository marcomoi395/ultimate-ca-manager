import { describe, expect, it } from 'bun:test';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import type { EjbcaAdapter, V3SuccessEnvelope } from '../src/common/contracts';

describe('gateway shared contracts', () => {
  it('boots the Nest module without contacting EJBCA', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });

  it('exposes stable V3 envelope and adapter contracts', () => {
    const envelope: V3SuccessEnvelope<{ status: string }> = {
      data: { status: 'ok' },
      message: 'ok',
      meta: {},
    };
    const adapter: EjbcaAdapter = {
      status: async () => 'unavailable',
    };
    expect(envelope.data.status).toBe('ok');
    expect(adapter).toBeDefined();
  });
});
