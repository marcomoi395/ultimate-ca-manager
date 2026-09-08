import { Injectable } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

@Injectable()
export class CsrsService {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  list(): Promise<unknown> {
    return this.adapter.listCsrs();
  }

  getById(id: string): Promise<unknown> {
    return this.adapter.request(`/v1/certificaterequest/${encodeURIComponent(id)}`);
  }

  history(): Promise<unknown> {
    return this.adapter.request('/v1/certificaterequest/history');
  }
}
