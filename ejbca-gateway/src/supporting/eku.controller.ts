import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('eku')
export class EkuController {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  @Get('known')
  known() { return this.adapter.request('/v1/ca').then(ok); }
}
