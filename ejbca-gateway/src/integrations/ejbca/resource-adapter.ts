export interface EJBCARequestClient {
  request(path: string, init?: RequestInit): Promise<unknown>;
}

export class EjbcaResourceAdapter {
  constructor(private readonly client: EJBCARequestClient) {}

  listCertificates(query?: URLSearchParams): Promise<unknown> {
    const page = Number(query?.get('page') ?? '1');
    const limit = Number(query?.get('limit') ?? '100');
    const criteria: Array<{ property: string; operation: string; value: string }> = [];
    const statuses = query?.getAll('status') ?? [];
    for (const status of statuses) criteria.push({ property: 'STATUS', operation: 'EQUAL', value: status });
    if (statuses.length === 0) criteria.push({ property: 'STATUS', operation: 'EQUAL', value: 'CERT_ACTIVE' });
    for (const caId of query?.getAll('ca_id') ?? []) criteria.push({ property: 'CA_ID', operation: 'EQUAL', value: caId });
    for (const source of query?.getAll('source') ?? []) criteria.push({ property: 'SOURCE', operation: 'EQUAL', value: source });
    if (query?.get('search')) criteria.push({ property: 'SEARCH', operation: 'LIKE', value: query.get('search')! });
    return this.client.request('/v2/certificate/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pagination: { current_page: page, page_size: limit },
        criteria,
        sort_by: query?.get('sort_by') ?? 'subject',
        sort_order: query?.get('sort_order') ?? 'asc',
      }),
    });
  }

  getCertificateCount(): Promise<unknown> {
    return this.client.request('/v2/certificate/count');
  }

  getCertificate(id: string, _issuer?: string): Promise<unknown> {
    return this.client.request('/v2/certificate/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pagination: { current_page: 1, page_size: 1 },
        criteria: [{ property: 'SERIAL_NUMBER', operation: 'EQUAL', value: id }],
        sort_by: 'subject',
        sort_order: 'asc',
      }),
    });
  }
  getRevocationStatus(issuer: string, serial: string): Promise<unknown> {
    return this.client.request(`/v1/certificate/${encodeURIComponent(issuer)}/${encodeURIComponent(serial)}/revocationstatus`);
  }


  listCas(query?: URLSearchParams): Promise<unknown> {
    const suffix = query && query.size > 0 ? `?${query.toString()}` : '';
    return this.client.request(`/v1/ca${suffix}`);
  }
  getCa(id: string): Promise<unknown> {
    return this.client.request(`/v1/ca/${encodeURIComponent(id)}`);
  }


  listCsrs(query?: URLSearchParams): Promise<unknown> {
    const suffix = query && query.size > 0 ? `?${query.toString()}` : '';
    return this.client.request(`/v1/certificaterequest${suffix}`);
  }

  listCsrHistory(query?: URLSearchParams): Promise<unknown> {
    const suffix = query && query.size > 0 ? `?${query.toString()}` : '';
    return this.client.request(`/v1/certificaterequest/history${suffix}`);
  }

  listTemplates(): Promise<unknown> {
    return this.client.request('/v1/endentity');
  }

  request(path: string, init?: RequestInit): Promise<unknown> {
    return this.client.request(path, init);
  }
  issueCertificate(body: unknown): Promise<unknown> {
    return this.client.request('/v1/certificate/pkcs10enroll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  }

  revokeCertificate(issuer: string, serial: string, reason: string): Promise<unknown> {
    return this.client.request(`/v1/certificate/${encodeURIComponent(issuer)}/${encodeURIComponent(serial)}/revoke?reason=${encodeURIComponent(reason)}`, { method: 'PUT' });
  }

  unholdCertificate(issuer: string, serial: string): Promise<unknown> {
    return this.revokeCertificate(issuer, serial, 'REMOVE_FROM_CRL');
  }
}
