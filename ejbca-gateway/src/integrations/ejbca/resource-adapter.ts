export interface EJBCARequestClient {
  request(path: string, init?: RequestInit): Promise<unknown>;
}

export class EjbcaResourceAdapter {
  constructor(private readonly client: EJBCARequestClient) {}

  listCertificates(query?: URLSearchParams): Promise<unknown> {
    const page = Number(query?.get('page') ?? '1');
    const limit = Number(query?.get('limit') ?? '100');
    return this.client.request('/v2/certificate/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pagination: { current_page: page, page_size: limit },
        criteria: [{ property: 'STATUS', operation: 'EQUAL', value: 'CERT_ACTIVE' }],
      }),
    });
  }

  getCertificateCount(): Promise<unknown> {
    return this.client.request('/v2/certificate/count');
  }

  getCertificate(id: string): Promise<unknown> {
    return this.client.request('/v1/certificate/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        max_number_of_results: 1,
        criteria: [{ property: 'SERIALNUMBER', operation: 'EQUAL', value: id }],
      }),
    });
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
}
