import { Controller, Get } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('hsm')
export class HsmController {
  @Get('providers') providers() { return ok([]); }
  @Get('keys') keys() { return ok([]); }
}
