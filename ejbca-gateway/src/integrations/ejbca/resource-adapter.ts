export interface EJBCARequestClient {
  request(path: string, init?: RequestInit): Promise<unknown>;
}

export class EjbcaResourceAdapter {
  constructor(private readonly client: EJBCARequestClient) {}

  listCertificates(): Promise<unknown> {
    return this.client.request('/certificates');
  }

  getCertificate(id: string): Promise<unknown> {
    return this.client.request(`/certificates/${encodeURIComponent(id)}`);
  }

  listCas(): Promise<unknown> {
    return this.client.request('/cas');
  }

  getCa(id: string): Promise<unknown> {
    return this.client.request(`/cas/${encodeURIComponent(id)}`);
  }

  listCsrs(): Promise<unknown> {
    return this.client.request('/csrs');
  }

  listTemplates(): Promise<unknown> {
    return this.client.request('/templates');
  }
}
