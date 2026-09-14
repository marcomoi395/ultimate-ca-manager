import { StreamableFile } from '@nestjs/common';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';
import { CertificatesService } from '../src/certificates/certificates.service';
import { EjbcaResourceAdapter } from '../src/integrations/ejbca/resource-adapter';

const serial = '00AF12';
const issuer = 'CN=Management CA,O=Example';
// A structurally valid, unsigned X.509 certificate. Its signature is intentionally
// not verified: the fixture only models public certificate bytes returned by EJBCA.
const leafDer = Buffer.from(
  '30643050a003020102020101300d06092a864886f70d01010b05003000301e170d3235303130313030303030305a170d3330303130313030303030305a30003013300d06092a864886f70d010101050003020000300d06092a864886f70d01010b0500030100',
  'hex',
);
const leafPem = Buffer.from(`-----BEGIN CERTIFICATE-----\n${leafDer.toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----\n`);
const ejbcaBase64Cert = Buffer.from(leafDer.toString('base64')).toString('base64');
const chainDer = Buffer.from(leafDer);
chainDer[11] = 2;

type ExportResult = {
  data: Buffer;
  type: string;
  filename: string;
};

type CertificateExportService = {
  exportFile(serial: string, body: { format: string; issuer?: string; include_chain?: boolean; include_key?: boolean; password?: string }, headers?: Record<string, string>): Promise<ExportResult>;
};

function privateKeyExportingService() {
  const adapter = {
    getCertificate: async () => ({ certificates: [{ serialNumber: serial, issuerDN: issuer, base64Cert: ejbcaBase64Cert }] }),
    getCertificateChain: async () => [],
  } as never;
  const proxy = {
    request: async (_path: string, request: { body?: string }) => {
      const body = JSON.parse(request.body ?? '{}');
      expect(body.format).toBe('pkcs12');
      expect(body.password).toBe('export-password');
      return {
        status: 200,
        headers: new Headers({ 'content-type': 'application/x-pkcs12', 'content-disposition': 'attachment; filename="cert.p12"' }),
        body: Uint8Array.from([1, 2, 3]).buffer,
      };
    },
  } as never;
  return new CertificatesService(adapter, undefined, proxy) as unknown as CertificateExportService;
}

function exportingService(base64Cert = ejbcaBase64Cert, chain: unknown = []) {
  const calls: Array<[string, string | undefined]> = [];
  const chainCalls: string[] = [];
  const adapter = {
    getCertificate: async (requestedSerial: string, requestedIssuer?: string) => {
      calls.push([requestedSerial, requestedIssuer]);
      return {
        certificates: [{
          serialNumber: serial,
          issuerDN: issuer,
          base64Cert,
        }],
      };
    },
    getCertificateChain: async (requestedIssuer: string) => {
      chainCalls.push(requestedIssuer);
      return chain;
    },
  } as never;
  return {
    calls,
    chainCalls,
    service: new CertificatesService(adapter) as unknown as CertificateExportService,
  };
}

function readPkcs7(bytes: Buffer) {
  const parsed = asn1js.fromBER(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  expect(parsed.offset).toBeGreaterThan(-1);
  const contentInfo = new pkijs.ContentInfo({ schema: parsed.result });
  expect(contentInfo.contentType).toBe('1.2.840.113549.1.7.2');
  return new pkijs.SignedData({ schema: contentInfo.content });
}

describe('CertificatesService.exportFile', () => {
  it('returns the EJBCA leaf PEM as a PEM attachment without a certificate chain', async () => {
    const { calls, service } = exportingService();

    const result = await service.exportFile(serial, { format: 'pem', issuer });

    expect(result).toEqual({
      data: leafPem,
      type: 'application/x-pem-file',
      filename: `${serial}.pem`,
    });
    expect(calls).toEqual([[serial, issuer]]);
  });

  it('returns the EJBCA leaf DER as a DER attachment without a certificate chain', async () => {
    const { calls, service } = exportingService();

    const result = await service.exportFile(serial, { format: 'der', issuer });

    expect(result).toEqual({
      data: leafDer,
      type: 'application/pkix-cert',
      filename: `${serial}.der`,
    });
    expect(calls).toEqual([[serial, issuer]]);
  });

  it('accepts direct Base64 DER certificate data', async () => {
    const { service } = exportingService(leafDer.toString('base64'));

    await expect(service.exportFile(serial, { format: 'der', issuer })).resolves.toMatchObject({
      data: leafDer,
      filename: `${serial}.der`,
    });
  });

  it('returns an unsigned PKCS#7 bundle containing only the requested leaf', async () => {
    const { calls, service } = exportingService();

    const result = await service.exportFile(serial, { format: 'pkcs7', issuer });

    expect(result).toMatchObject({
      type: 'application/pkcs7-mime',
      filename: `${serial}.p7b`,
    });
    const bundle = readPkcs7(result.data);
    expect(bundle.signerInfos).toHaveLength(0);
    expect(bundle.certificates).toHaveLength(1);
    expect(Buffer.from(bundle.certificates![0].toSchema().toBER(false))).toEqual(leafDer);
    expect(calls).toEqual([[serial, issuer]]);
  });

  it('accepts P7B as the PKCS#7 export alias', async () => {
    const { calls, service } = exportingService();

    const result = await service.exportFile(serial, { format: 'p7b', issuer });

    expect(result).toMatchObject({
      type: 'application/pkcs7-mime',
      filename: `${serial}.p7b`,
    });
    expect(readPkcs7(result.data).certificates).toHaveLength(1);
    expect(calls).toEqual([[serial, issuer]]);
  });
  it('includes EJBCA CA chain certificates in PEM when requested', async () => {
    const { service, chainCalls } = exportingService(ejbcaBase64Cert, [chainDer.toString('base64')]);

    const result = await service.exportFile(serial, { format: 'pem', issuer, include_chain: true });

    expect((result.data.toString().match(/-----BEGIN CERTIFICATE-----/g) ?? []).length).toBe(2);
    expect(chainCalls).toEqual([issuer]);
  });

  it('includes EJBCA CA chain certificates in PKCS#7 when requested', async () => {
    const { service } = exportingService(ejbcaBase64Cert, [chainDer.toString('base64')]);

    const result = await service.exportFile(serial, { format: 'p7b', issuer, include_chain: true });

    expect(readPkcs7(result.data).certificates).toHaveLength(2);
  });

  it('pages every serial match before binding the requested issuer', async () => {
    const pages: number[] = [];
    const otherIssuers = Array.from({ length: 100 }, (_, index) => ({
      serialNumber: serial,
      issuerDN: `CN=Other ${index}`,
    }));
    const adapter = new EjbcaResourceAdapter({
      request: async (_path, init) => {
        const request = JSON.parse(String(init?.body));
        pages.push(request.pagination.current_page);
        return request.pagination.current_page === 1
          ? { certificates: otherIssuers }
          : {
            certificates: [{
              serialNumber: serial,
              issuerDN: issuer,
              base64Cert: ejbcaBase64Cert,
            }],
          };
      },
    });
    const service = new CertificatesService(adapter);

    await expect(service.exportFile(serial, { format: 'der', issuer })).resolves.toMatchObject({
      data: leafDer,
      filename: `${serial}.der`,
    });
    expect(pages).toEqual([1, 2]);
  });

  it('rejects an export without the issuer required to identify the EJBCA certificate', async () => {
    const { calls, service } = exportingService();

    await expect(service.exportFile(serial, { format: 'pem' })).rejects.toMatchObject({ status: 400 });
    expect(calls).toEqual([]);
  });
  it('forwards PKCS12 export to UCM with password and returns binary attachment', async () => {
    const service = privateKeyExportingService();
    const result = await service.exportFile(serial, { format: 'pkcs12', issuer, include_key: true, password: 'export-password' });
    expect(result).toEqual({ data: Buffer.from([1, 2, 3]), type: 'application/x-pkcs12', filename: 'cert.p12' });
  });

  it('rejects include_key with public-only formats', async () => {
    const { service } = exportingService();
    await expect(service.exportFile(serial, { format: 'der', issuer, include_key: true })).rejects.toMatchObject({ status: 400 });
  });

  it('rejects private-key formats when UCM proxy is unavailable', async () => {
    const { service } = exportingService();
    await expect(service.exportFile(serial, { format: 'jks', issuer, password: 'export-password' })).rejects.toMatchObject({ status: 502 });
  });

  it('rejects unsupported certificate export formats', async () => {
    const { calls, service } = exportingService();

    await expect(service.exportFile(serial, { format: 'zip', issuer })).rejects.toMatchObject({ status: 400 });
    expect(calls).toEqual([]);
  });
});

describe('CertificatesController.export', () => {
  it('returns the service result as a binary attachment and forwards the issuer', async () => {
    const calls: unknown[][] = [];
    const service = {
      exportFile: async (...args: unknown[]) => {
        calls.push(args);
        return {
          data: leafPem,
          type: 'application/x-pem-file',
          filename: `${serial}.pem`,
        };
      },
    } as never;
    const controller = new CertificatesController(service);

    const result = await controller.export(serial, { format: 'pem', issuer }) as StreamableFile;

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getHeaders()).toMatchObject({
      type: 'application/x-pem-file',
      disposition: `attachment; filename="${serial}.pem"`,
      length: leafPem.length,
    });
    expect(calls).toEqual([[serial, { format: 'pem', issuer }]]);
  });

  it('requires read:certificates permission for certificate export', () => {
    expect(Reflect.getMetadata('v3_required_permission', CertificatesController.prototype.export)).toBe('read:certificates');
  });
});
