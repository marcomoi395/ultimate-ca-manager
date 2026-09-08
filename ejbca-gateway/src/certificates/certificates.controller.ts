import { Controller, Get, Param, Query } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { parseCertificateListQuery, type CertificateListQueryInput } from './dtos/certificate-list.query';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Get('stats')
  stats() { return this.service.stats(); }

  @Get('compliance')
  compliance() { return this.service.compliance(); }

  @Get('lint/status')
  lintStatus() { return this.service.lintStatus(); }

  @Get()
  list(@Query() query: CertificateListQueryInput) {
    return this.service.list(parseCertificateListQuery(query));
  }

  @Get(':id/lint')
  lint(@Param('id') id: string) { return this.service.getById(id); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.service.getById(id); }
}
