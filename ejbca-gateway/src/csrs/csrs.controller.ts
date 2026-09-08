import { Controller, Get, Param } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { CsrsService } from './csrs.service';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('csrs')
export class CsrsController {
  constructor(private readonly service: CsrsService) {}

  @Get()
  list() { return this.service.list().then(ok); }

  @Get('history')
  history() { return this.service.history().then(ok); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.service.getById(id).then(ok); }
}
