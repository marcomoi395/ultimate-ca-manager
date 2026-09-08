import { Controller, Get, Param, Query } from '@nestjs/common';
import { CasService } from './cas.service';
import { parseCaListQuery, type CaListQueryInput } from './dtos/ca-list.query';

@Controller('cas')
export class CasController {
  constructor(private readonly service: CasService) {}

  @Get()
  list(@Query() query: CaListQueryInput) {
    return this.service.list(parseCaListQuery(query));
  }

  @Get(':id/certificates')
  certificates(@Param('id') id: string, @Query() query: CaListQueryInput) {
    return this.service.certificates(id, parseCaListQuery(query));
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.getById(id);
  }
}

@Controller('cas/:caId/templates')
export class CaTemplatesController {
  constructor(private readonly service: CasService) {}

  @Get()
  list(@Param('caId') caId: string) {
    return this.service.templates(caId);
  }
}
