import { Injectable } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

@Injectable()
export class TemplatesService {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  list(): Promise<unknown> {
    return this.adapter.listTemplates();
  }

  getById(id: string): Promise<unknown> {
    return this.adapter.request(`/v1/endentity/${encodeURIComponent(id)}`);
  }
}
