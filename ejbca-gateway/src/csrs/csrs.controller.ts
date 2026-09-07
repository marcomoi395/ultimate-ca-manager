import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('csrs')
export class CsrsController {
  @Get() list() { return ok([]); }
  @Get('history') history() { return ok([]); }
  @Get(':id') detail() { return ok({}); }
}
