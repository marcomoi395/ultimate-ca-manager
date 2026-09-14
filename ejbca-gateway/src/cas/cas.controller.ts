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

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
