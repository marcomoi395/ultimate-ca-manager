import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('cas')
export class CasController {
  @Get() list() { return ok([]); }
  @Get(':id/certificates') certificates() { return ok([]); }
  @Get(':id') detail() { return ok({}); }
}

@Controller('cas/:caId/templates')
export class CaTemplatesController {
  @Get() list() { return ok([]); }
}
