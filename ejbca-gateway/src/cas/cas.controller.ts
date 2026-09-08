import { Controller, Get, Param } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { CasService } from './cas.service';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('cas')
export class CasController {
  constructor(private readonly service: CasService) {}

  @Get()
  list() { return this.service.list().then(ok); }

  @Get(':id/certificates')
  certificates(@Param('id') id: string) { return this.service.certificates(id).then(ok); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.service.getById(id).then(ok); }
}

@Controller('cas/:caId/templates')
export class CaTemplatesController {
  constructor(private readonly service: CasService) {}

  @Get()
  list(@Param('caId') caId: string) { return this.service.templates(caId).then(ok); }
}
