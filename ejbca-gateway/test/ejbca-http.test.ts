import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'bun:test';
import { EjbcaHttpClient } from '../src/integrations/ejbca/http-client';

const certDir = '/tmp/ejbca-gateway-test-certs';
mkdirSync(certDir, { recursive: true });
writeFileSync(`${certDir}/ca.crt`, 'ca');
writeFileSync(`${certDir}/client.crt`, 'client-cert');
writeFileSync(`${certDir}/client.key`, 'client-key');

describe('EJBCA HTTP client', () => {
  it('sends mTLS options with EJBCA requests', async () => {
    let requestInit: RequestInit | undefined;
    const client = new EjbcaHttpClient({
      baseUrl: 'https://ejbca.test',
      caCertFile: `${certDir}/ca.crt`,
      clientCertFile: `${certDir}/client.crt`,
      clientKeyFile: `${certDir}/client.key`,
      fetcher: async (_input, init) => {
        requestInit = init;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });

    await client.request('/v1/ca');
    expect((requestInit as { tls: { ca: string; cert: string; key: string } }).tls).toEqual({ ca: 'ca', cert: 'client-cert', key: 'client-key' });
  });

  it('does not retry side-effect requests', async () => {
    let calls = 0;
    const client = new EjbcaHttpClient({
      baseUrl: 'https://ejbca.test',
      caCertFile: `${certDir}/ca.crt`,
      clientCertFile: `${certDir}/client.crt`,
      clientKeyFile: `${certDir}/client.key`,
      fetcher: async () => {
        calls += 1;
        return new Response('bad', { status: 503 });
      },
    });
    await expect(client.request('/import', { method: 'POST' })).rejects.toThrow();
    expect(calls).toBe(1);
  });
});

afterAll(() => rmSync(certDir, { recursive: true, force: true }));
