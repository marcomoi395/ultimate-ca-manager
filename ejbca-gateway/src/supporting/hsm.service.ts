import { Inject, Injectable, Optional } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

/**
 * Metadata-only HSM discovery. EJBCA REST exposes cryptotoken reads only;
 * provider/key mutations, tests, and key operations remain backend (UCM v2)
 * capabilities until an upstream contract exists.
 */
@Injectable()
export class HsmService {
  constructor(@Inject(EjbcaResourceAdapter) @Optional() private readonly adapter?: EjbcaResourceAdapter) {}

  async providers(): Promise<unknown> {
    if (!this.adapter) return [];
    return this.adapter.request('/v1/cryptotoken');
  }

  async keys(): Promise<unknown> {
    if (!this.adapter) return [];
    return this.adapter.request('/v1/cryptotoken/keypair');
  }

  async status(): Promise<{ status: 'unavailable' }> {
    return { status: 'unavailable' };
  }
}
