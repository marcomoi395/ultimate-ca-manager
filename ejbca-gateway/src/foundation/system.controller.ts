import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('system')
export class SystemController {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  @Get('chain-repair')
  chainRepair() { return this.adapter.request('/v1/ca/status').then(ok); }

  @Get('hsm-status')
  hsmStatus() { return this.adapter.request('/v1/cryptotoken/status').then(ok); }
}
