import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('microsoft-cas')
export class MscaController {
  @Get('enabled') enabled() { return ok({ enabled: false }); }
  @Get('requests/pending') pending() { return ok([]); }
  @Get(':id/templates') templates() { return ok([]); }
  @Get(':id/requests/:requestId') request() { return ok({ status: 'unavailable' }); }
}
