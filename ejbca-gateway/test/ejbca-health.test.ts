import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'bun:test';
import { EjbcaHealthProbe } from '../src/foundation/ejbca-health.probe';

const certDir = '/tmp/ejbca-gateway-health-certs';
mkdirSync(certDir, { recursive: true });
writeFileSync(`${certDir}/ca.crt`, 'ca');
writeFileSync(`${certDir}/client.crt`, 'client-cert');
writeFileSync(`${certDir}/client.key`, 'client-key');

const originalEnv = { ...process.env };

function setProbeEnv() {
  process.env.EJBCA_API_URL = 'https://ejbca.test/ejbca/ejbca-rest-api';
  process.env.EJBCA_CA_CERT_FILE = `${certDir}/ca.crt`;
  process.env.EJBCA_CLIENT_CERT_FILE = `${certDir}/client.crt`;
  process.env.EJBCA_CLIENT_KEY_FILE = `${certDir}/client.key`;
  process.env.EJBCA_TIMEOUT_MS = '1000';
}

describe('EJBCA health probe', () => {
  it('reports healthy for a successful upstream response', async () => {
    setProbeEnv();
    const probe = new EjbcaHealthProbe(async (input, init) => {
      expect(String(input)).toBe('https://ejbca.test/ejbca/ejbca-rest-api/v1/ca');
      expect((init as { tls: unknown }).tls).toEqual({ ca: 'ca', cert: 'client-cert', key: 'client-key' });
      return new Response('[]', { status: 200 });
    });
    expect(await probe.check()).toBe('healthy');
  });

  it('reports unavailable when upstream connection fails', async () => {
    setProbeEnv();
    const probe = new EjbcaHealthProbe(async () => {
      throw new Error('connection refused');
    });
    expect(await probe.check()).toBe('unavailable');
  });
});

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(certDir, { recursive: true, force: true });
});
