import { Controller, Get, Param } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { TemplatesService } from './templates.service';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  list() { return this.service.list().then(ok); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.service.getById(id).then(ok); }
}
