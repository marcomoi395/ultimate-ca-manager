import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('templates')
export class TemplatesController {
  @Get() list() { return ok([]); }
  @Get(':id') detail() { return ok({ usageCount: 0 }); }
}
