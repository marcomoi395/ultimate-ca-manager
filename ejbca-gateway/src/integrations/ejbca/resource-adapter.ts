export interface EJBCARequestClient {
  request(path: string, init?: RequestInit): Promise<unknown>;
}

export class EjbcaResourceAdapter {
  constructor(private readonly client: EJBCARequestClient) {}

  listCertificates(query?: URLSearchParams): Promise<unknown> {
    const suffix = query && query.size > 0 ? `?${query.toString()}` : '';
    return this.client.request(`/v1/certificate${suffix}`);
  }

  getCertificate(id: string): Promise<unknown> {
    return this.client.request(`/v1/certificate/${encodeURIComponent(id)}`);
  }

  listCas(): Promise<unknown> {
    return this.client.request('/v1/ca');
  }

  getCa(id: string): Promise<unknown> {
    return this.client.request(`/v1/ca/${encodeURIComponent(id)}`);
  }

  listCsrs(): Promise<unknown> {
    return this.client.request('/v1/certificaterequest');
  }

  listTemplates(): Promise<unknown> {
    return this.client.request('/v1/endentity');
  }

  request(path: string, init?: RequestInit): Promise<unknown> {
    return this.client.request(path, init);
  }
}
