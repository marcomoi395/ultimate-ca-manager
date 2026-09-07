import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('eku')
export class EkuController {
  @Get('known') known() { return ok([]); }
}
