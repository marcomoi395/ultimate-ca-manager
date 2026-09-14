import { describe, expect, it } from 'bun:test';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { CertificatesModule } from '../src/certificates/certificates.module';
import { CasModule } from '../src/cas/cas.module';
import { CsrsModule } from '../src/csrs/csrs.module';
import { TemplatesModule } from '../src/templates/templates.module';
import { SupportingModule } from '../src/supporting/supporting.module';

describe('domain module composition', () => {
  it('imports separate domain modules into the application', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef.get(CertificatesModule)).toBeDefined();
    expect(moduleRef.get(CasModule)).toBeDefined();
    expect(moduleRef.get(CsrsModule)).toBeDefined();
    expect(moduleRef.get(TemplatesModule)).toBeDefined();
    expect(moduleRef.get(SupportingModule)).toBeDefined();
    await moduleRef.close();
  });
});
