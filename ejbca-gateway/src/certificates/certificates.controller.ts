import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('certificates')
export class CertificatesController {
  @Get() list() { return ok([]); }
  @Get('stats') stats() { return ok({ total: 0 }); }
  @Get('compliance') compliance() { return ok({ status: 'unverified' }); }
  @Get('lint/status') lintStatus() { return ok({ status: 'unverified' }); }
  @Get(':id') detail() { return ok({}); }
  @Get(':id/lint') lint() { return ok({ status: 'unverified' }); }
}
