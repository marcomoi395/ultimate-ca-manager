import { describe, expect, it } from 'bun:test';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { CertificatesController } from '../src/facades.controller';

describe('facade route registration', () => {
  it('boots all read and supporting facade controllers', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef.get(CertificatesController)).toBeDefined();
    await moduleRef.close();
  });
});
