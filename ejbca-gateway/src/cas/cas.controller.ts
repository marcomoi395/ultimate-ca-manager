import { Controller, Get, Param } from '@nestjs/common';
import { CasService } from './cas.service';

@Controller('cas')
export class CasController {
  constructor(private readonly service: CasService) {}

  @Get()
  list() { return this.service.list(); }

  @Get(':id/certificates')
  certificates(@Param('id') id: string) { return this.service.certificates(id); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.service.getById(id); }
}

@Controller('cas/:caId/templates')
export class CaTemplatesController {
  constructor(private readonly service: CasService) {}

  @Get()
  list(@Param('caId') caId: string) { return this.service.templates(caId); }
}
