import { Injectable } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

@Injectable()
export class CasService {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  list(): Promise<unknown> {
    return this.adapter.listCas();
  }

  getById(id: string): Promise<unknown> {
    return this.adapter.getCa(id);
  }

  certificates(id: string): Promise<unknown> {
    return this.adapter.request(`/v1/ca/${encodeURIComponent(id)}/certificate`);
  }

  templates(id: string): Promise<unknown> {
    return this.adapter.request(`/v1/ca/${encodeURIComponent(id)}/certificateprofile`);
  }
}
