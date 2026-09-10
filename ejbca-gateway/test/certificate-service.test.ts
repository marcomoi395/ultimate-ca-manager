import { describe, expect, it } from 'bun:test';
import { CertificatesService } from '../src/certificates/certificates.service';
import { certificateRequestPem } from './fixtures/certificate-request';

describe('CertificatesService', () => {
  it('returns paginated public certificate data', async () => {
    const service = new CertificatesService(async () => [{ id: 'cert-1', status: 'MATCHED' }]);
    const result = await service.list({ page: 1, limit: 10 });
    expect(result.data[0].id).toBe('cert-1');
    expect(result.meta.page).toBe(1);
  });
  it('computes statistics from certificate records', async () => {
    const calls: string[] = [];
    const adapter = {
      listCertificates: async (query: URLSearchParams) => {
        calls.push('list');
        return query.get('status') === 'CERT_ACTIVE'
          ? { certificates: [{ valid_to: '2099-01-01T00:00:00Z' }] }
          : { certificates: [] };
      },
    } as never;
    const service = new CertificatesService(adapter);
    await expect(service.stats()).resolves.toEqual({ total: 1, valid: 1, expiring: 0, expired: 0, revoked: 0, sources: ['manual'] });
    expect(calls).toEqual(['list', 'list']);
  });
  it('uses EJBCA revocationstatus when computing certificate statistics', async () => {
    const service = new CertificatesService({
      listCertificates: async (query: URLSearchParams) => query.get('status') === 'CERT_REVOKED'
        ? { certificates: [{
          serial_number: '00af12',
          issuer_dn: 'CN=Example CA,O=Example',
          status: 'CERT_REVOKED',
          revoked: true,
          valid_to: '2099-01-01T00:00:00Z',
        }] }
        : { certificates: [] },
      getRevocationStatus: async () => ({ revoked: false }),
    } as never);

    await expect(service.stats()).resolves.toEqual({
      total: 1, valid: 1, expiring: 0, expired: 0, revoked: 0, sources: ['manual'],
    });
  });

  it('maps frontend statuses to EJBCA statuses and filters normalized results', async () => {
    const calls: URLSearchParams[] = [];
    const adapter = {
      listCertificates: async (query: URLSearchParams) => {
        calls.push(query);
        return query.get('status') === 'CERT_REVOKED'
          ? { certificates: [{ serial_number: 'revoked', status: 'CERT_REVOKED', revoked: true, valid_to: '2099-01-01T00:00:00Z' }] }
          : { certificates: [
            { serial_number: 'valid', status: 'CERT_ACTIVE', valid_to: '2099-01-01T00:00:00Z' },
            { serial_number: 'expiring', status: 'CERT_ACTIVE', valid_to: new Date(Date.now() + 10 * 86400000).toISOString() },
          ] };
      },
    } as never;
    const service = new CertificatesService(adapter);
    const result = await service.list({ page: 1, limit: 25, status: ['expiring', 'valid', 'revoked'] });
    expect(result.data.map((certificate) => certificate.status)).toEqual(['valid', 'expiring', 'revoked']);
    expect(calls.map((query) => query.get('status'))).toEqual(['CERT_ACTIVE', 'CERT_REVOKED']);
  });
  it('includes revoked certificates when no status filter is supplied', async () => {
    const calls: URLSearchParams[] = [];
    const adapter = {
      listCertificates: async (query: URLSearchParams) => {
        calls.push(query);
        return query.get('status') === 'CERT_REVOKED'
          ? { certificates: [{ serial_number: 'revoked', subject_dn: 'CN=a-revoked.example', status: 'CERT_REVOKED', revoked: true, valid_to: '2099-01-01T00:00:00Z' }] }
          : { certificates: [{ serial_number: 'valid', subject_dn: 'CN=z-active.example', status: 'CERT_ACTIVE', valid_to: '2099-01-01T00:00:00Z' }] };
      },
    } as never;
    const service = new CertificatesService(adapter);

    const result = await service.list({ page: 1, limit: 25, sortBy: 'subject', sortOrder: 'asc' });

    expect(calls.map((query) => query.get('status'))).toEqual(['CERT_ACTIVE', 'CERT_REVOKED']);
    expect(result.data.map((certificate) => certificate.status)).toEqual(['revoked', 'valid']);
    expect(result.data.map((certificate) => certificate.subject)).toEqual(['CN=a-revoked.example', 'CN=z-active.example']);
  });
  it('fetches all upstream pages before default pagination', async () => {
    const active = Array.from({ length: 101 }, (_, index) => ({
      serial_number: `active-${String(index).padStart(3, '0')}`,
      subject_dn: `CN=m-active-${String(index).padStart(3, '0')}.example`,
      status: 'CERT_ACTIVE',
    }));
    const revoked = [{ serial_number: 'revoked-000', subject_dn: 'CN=a-revoked.example', status: 'CERT_REVOKED' }];
    const calls: URLSearchParams[] = [];
    const adapter = {
      listCertificates: async (query: URLSearchParams) => {
        calls.push(query);
        const rows = query.get('status') === 'CERT_REVOKED' ? revoked : active;
        const page = Number(query.get('page'));
        const limit = Number(query.get('limit'));
        return {
          certificates: rows.slice((page - 1) * limit, page * limit),
          pagination_summary: { total_certs: rows.length },
        };
      },
    } as never;
    const result = await new CertificatesService(adapter).list({ page: 5, limit: 25 });

    expect(result.meta.total).toBe(102);
    expect(result.data.map((certificate) => certificate.serial_number)).toEqual(['active-099', 'active-100']);
    expect(calls.filter((query) => query.get('status') === 'CERT_ACTIVE').map((query) => query.get('page'))).toEqual(['1', '2']);
  });
  it('paginates an explicit revoked filter locally', async () => {
    const revoked = Array.from({ length: 30 }, (_, index) => ({
      serial_number: `revoked-${String(index).padStart(2, '0')}`,
      status: 'CERT_REVOKED',
    }));
    const adapter = {
      listCertificates: async (query: URLSearchParams) => {
        const page = Number(query.get('page'));
        const limit = Number(query.get('limit'));
        return {
          certificates: revoked.slice((page - 1) * limit, page * limit),
          pagination_summary: { total_certs: revoked.length },
        };
      },
    } as never;
    const result = await new CertificatesService(adapter).list({ page: 2, limit: 25, status: ['revoked'] });

    expect(result.meta.total).toBe(30);
    expect(result.data.map((certificate) => certificate.serial_number)).toEqual([
      'revoked-25', 'revoked-26', 'revoked-27', 'revoked-28', 'revoked-29',
    ]);
  });
  it('reports the locally filtered total for active certificate states', async () => {
    const adapter = {
      listCertificates: async () => ({
        certificates: [
          { serial_number: 'valid', valid_to: '2099-01-01T00:00:00Z', status: 'CERT_ACTIVE' },
          { serial_number: 'expired', valid_to: '2020-01-01T00:00:00Z', status: 'CERT_ACTIVE' },
        ],
        pagination_summary: { total_certs: 2 },
      }),
    } as never;
    const result = await new CertificatesService(adapter).list({ page: 1, limit: 25, status: ['valid'] });

    expect(result.meta.total).toBe(1);
    expect(result.data.map((certificate) => certificate.serial_number)).toEqual(['valid']);
  });
  it('rejects implausible upstream pagination totals', async () => {
    const adapter = {
      listCertificates: async () => ({
        certificates: [],
        pagination_summary: { total_certs: 100001 },
      }),
    } as never;

    await expect(new CertificatesService(adapter).list({ page: 1, limit: 25 }))
      .rejects.toMatchObject({ status: 502 });
  });
  it('uses subject as a status-sort tie breaker', async () => {
    const service = new CertificatesService(async () => [
      { serial_number: 'z', subject_dn: 'CN=z.example', status: 'CERT_ACTIVE' },
      { serial_number: 'a', subject_dn: 'CN=a.example', status: 'CERT_ACTIVE' },
    ]);

    const result = await service.list({ page: 1, limit: 25, status: ['valid'], sortBy: 'status' });

    expect(result.data.map((certificate) => certificate.serial_number)).toEqual(['a', 'z']);
  });
  it('sorts by the normalized key algorithm field', async () => {
    const service = new CertificatesService(async () => [
      { serial_number: 'strong', key_algorithm: 'RSA 4096', status: 'CERT_ACTIVE' },
      { serial_number: 'weak', key_algorithm: 'RSA 2048', status: 'CERT_ACTIVE' },
    ]);

    const result = await service.list({ page: 1, limit: 25, sortBy: 'key_algo' });

    expect(result.data.map((certificate) => certificate.serial_number)).toEqual(['weak', 'strong']);
  });
  it('maps revoked EJBCA statuses to the public revoked flag', async () => {
    const service = new CertificatesService(async () => [
      { serial_number: 'revoked', status: 'CERT_REVOKED' },
    ]);

    const result = await service.list({ page: 1, limit: 25 });

    expect(result.data[0]).toMatchObject({ status: 'revoked', revoked: true });
  });
  it('treats active certificates with historical revocation data as valid', async () => {
    const service = new CertificatesService(async () => [
      {
        serial_number: 'unheld',
        status: 'CERT_ACTIVE',
        revocationDate: 1700000000000,
        revocationReason: 'CERTIFICATE_HOLD',
        valid_to: '2099-01-01T00:00:00Z',
      },
    ]);

    const result = await service.list({ page: 1, limit: 25 });

    expect(result.data[0]).toMatchObject({ status: 'valid', revoked: false, revoked_at: null });
  });
  it('treats an explicitly revoked certificate as revoked without a status field', async () => {
    const service = new CertificatesService(async () => [{
      serial_number: 'revoked-flag',
      revoked: true,
      valid_to: '2099-01-01T00:00:00Z',
    }]);

    const result = await service.list({ page: 1, limit: 25 });

    expect(result.data[0]).toMatchObject({ status: 'revoked', revoked: true });
  });
  it('uses EJBCA revocationstatus as the current source of truth', async () => {
    const service = new CertificatesService({
      listCertificates: async () => ({ certificates: [{
        serial_number: '00af12',
        issuer_dn: 'CN=Example CA,O=Example',
        status: 'CERT_REVOKED',
        revoked: true,
        revocationDate: 1700000000000,
        valid_to: '2099-01-01T00:00:00Z',
      }] }),
      getRevocationStatus: async () => ({ revoked: false }),
    } as never);

    const result = await service.list({ page: 1, limit: 25 });

    expect(result.data[0]).toMatchObject({ status: 'valid', revoked: false, revoked_at: null });
  });
  it('does not proxy certificate reads through UCM v2', async () => {
    const adapter = {
      listCertificates: async (query: URLSearchParams) => query.get('status') === 'CERT_ACTIVE'
        ? { certificates: [{ id: 'cert-1' }] }
        : { certificates: [] },
    } as never;
    const service = new CertificatesService(adapter);
    await expect(service.list({ page: 1, limit: 25 })).resolves.toMatchObject({
      data: [expect.objectContaining({ id: 'cert-1', serial_number: 'cert-1', subject: null, issuer: null, status: 'valid', has_private_key: false })],
      meta: { page: 1, per_page: 25, total: 1 },
    });
  });
  it('maps EJBCA records to a safe v2-compatible public shape', async () => {
    const service = new CertificatesService(async () => [{
      serial_number: '00af12',
      subject_dn: 'CN=example.com',
      issuer_dn: 'CN=Example CA',
      status: 'CERT_ACTIVE',
      certificate_data: 'PRIVATE-RAW-CERT',
      private_key: 'PRIVATE-KEY',
    }]);
    const result = await service.list({ page: 1, limit: 10 });
    expect(result.data[0]).toEqual(expect.objectContaining({
      id: '00af12',
      serial_number: '00af12',
      subject: 'CN=example.com',
      issuer: 'CN=Example CA',
      status: 'valid',
      has_private_key: false,
    }));
    expect(result.data[0]).not.toHaveProperty('private_key');
    expect(result.data[0]).not.toHaveProperty('certificate_data');
  });
  it('preserves EJBCA base64-encoded PEM certificates', async () => {
    const pem = '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n';
    const service = new CertificatesService(async () => [{
      serial_number: 'pem-cert',
      subject_dn: 'CN=pem.example',
      base64Cert: btoa(pem),
    }]);
    const result = await service.list({ page: 1, limit: 1 });
    expect(result.data[0].pem).toBe(pem);
  });
  it('normalizes EJBCA hexadecimal serial numbers to decimal', async () => {
    const service = new CertificatesService(async () => [{ serialNumber: '00af12', serial_number: '00af12', subject_dn: 'CN=decimal.example' }]);
    const result = await service.list({ page: 1, limit: 1 });
    expect(result.data[0].serial_number_decimal).toBe('44818');
  });
  it('computes v2-compatible status counts and normalized sources', async () => {
    const service = new CertificatesService(async () => [
      { serial_number: 'valid', valid_to: '2099-01-01T00:00:00Z', source: null },
      { serial_number: 'expiring', valid_to: new Date(Date.now() + 10 * 86400000).toISOString(), source: 'ejbca' },
      { serial_number: 'expired', valid_to: '2020-01-01T00:00:00Z', source: 'manual' },
      { serial_number: 'revoked', valid_to: '2099-01-01T00:00:00Z', revoked: true, source: 'ejbca' },
    ]);
    await expect(service.stats()).resolves.toEqual({
      total: 4, valid: 1, expiring: 1, expired: 1, revoked: 1, sources: ['ejbca', 'manual'],
    });
  });
  it('enrolls an external CSR and returns only public certificate material', async () => {
    const calls: unknown[] = [];
    const service = new CertificatesService({
      issueCertificate: async (body: unknown) => {
        calls.push(body);
        return {
          certificate: 'DER_CERTIFICATE',
          certificate_chain: ['DER_ISSUER'],
          serial_number: '00AF12',
          response_format: 'DER',
          password: 'must-not-leak',
        };
      },
    } as never);

    const result = await service.issue({
      certificate_request: certificateRequestPem,
      certificate_profile_name: 'TLS',
      end_entity_profile_name: 'Default',
      certificate_authority_name: 'ManagementCA',
      username: 'enroll-user',
      password: 'secret',
    });

    expect(calls).toEqual([expect.objectContaining({
      certificate_request: expect.any(String),
      certificate_request_type: 'PKCS10',
      include_chain: true,
      response_format: 'DER',
      end_entity: expect.objectContaining({
        username: 'enroll-user',
        password: 'secret',
        subject_dn: 'CN=import.example.test,OU=Gateway,O=UCM,C=VN',
      }),
    })]);
    expect(result).toEqual({
      certificate: 'DER_CERTIFICATE',
      certificate_chain: ['DER_ISSUER'],
      serial_number: '00AF12',
      response_format: 'DER',
    });
  });
  it('returns a public revoke result when EJBCA responds with an empty body', async () => {
    const service = new CertificatesService({
      revokeCertificate: async () => null,
    } as never);

    await expect(service.revoke('00AF12', { issuer: 'CN=ManagementCA' })).resolves.toEqual({
      serial_number: '00AF12',
      revoked: true,
      reason: 'UNSPECIFIED',
    });
  });
});
