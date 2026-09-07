import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('system')
export class SystemController {
  @Get('chain-repair') chainRepair() { return ok({ status: 'unverified' }); }
  @Get('hsm-status') hsmStatus() { return ok({ status: 'unverified' }); }
}
