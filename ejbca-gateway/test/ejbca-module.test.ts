import { describe, expect, it } from 'bun:test';
import { EjbcaHttpClient } from '../src/integrations/ejbca/http-client';
import { EjbcaModule } from '../src/integrations/ejbca/ejbca.module';
import { EjbcaResourceAdapter } from '../src/integrations/ejbca/resource-adapter';

describe('EJBCA integration module', () => {
  it('exports the shared mTLS client and resource adapter', () => {
    expect(EjbcaModule).toBeDefined();
    expect(EjbcaHttpClient).toBeDefined();
    expect(EjbcaResourceAdapter).toBeDefined();
  });
});
