import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('hsm')
export class HsmController {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  @Get('providers')
  providers() { return this.adapter.request('/v1/cryptotoken').then(ok); }

  @Get('keys')
  keys() { return this.adapter.request('/v1/cryptotoken/keypair').then(ok); }
}
