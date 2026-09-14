import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'bun:test';
import { EjbcaHttpClient } from '../src/integrations/ejbca/http-client';

const certDir = '/tmp/ejbca-gateway-test-certs';
mkdirSync(certDir, { recursive: true });
writeFileSync(`${certDir}/ca.crt`, 'ca');
writeFileSync(`${certDir}/client.crt`, 'client-cert');
writeFileSync(`${certDir}/client.key`, 'client-key');

function client(fetcher: typeof fetch): EjbcaHttpClient {
  return new EjbcaHttpClient({
    baseUrl: 'https://ejbca.test',
    caCertFile: `${certDir}/ca.crt`,
    clientCertFile: `${certDir}/client.crt`,
    clientKeyFile: `${certDir}/client.key`,
    fetcher,
  });
}

describe('EJBCA HTTP client', () => {
  it('sends mTLS options with EJBCA requests', async () => {
    let requestInit: RequestInit | undefined;
    await client(async (_input, init) => {
      requestInit = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }).request('/v1/ca');
    expect((requestInit as { tls: { ca: string; cert: string; key: string } }).tls).toEqual({ ca: 'ca', cert: 'client-cert', key: 'client-key' });
  });

  it('does not retry side-effect requests', async () => {
    let calls = 0;
    await expect(client(async () => {
      calls += 1;
      return new Response('bad', { status: 503 });
    }).request('/import', { method: 'POST' })).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it('rejects an HTML page returned as a successful upstream response', async () => {
    await expect(client(async () => new Response('<html>admin ui</html>', { status: 200, headers: { 'content-type': 'text/html' } })).request('/v1/certificate')).rejects.toMatchObject({ code: 'EJBCA_502' });
  });
});

afterAll(() => rmSync(certDir, { recursive: true, force: true }));
