import { Controller, Post } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('import')
export class ImportController {
  @Post('analyze') analyze() { return ok({ status: 'analyzed' }); }
  @Post('execute') execute() { return ok({ status: 'blocked' }); }
}
