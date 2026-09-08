import { Controller, Get, Param, Query } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { CertificatesService } from './certificates.service';
import { parseCertificateListQuery, type CertificateListQueryInput } from './dtos/certificate-list.query';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Get('stats')
  stats() {
    return this.service.list(parseCertificateListQuery({ page: '1', limit: '1' })).then((data) => ok({ data }));
  }

  @Get('compliance')
  compliance() {
    return this.service.list(parseCertificateListQuery({ page: '1', limit: '100' })).then((data) => ok({ data }));
  }

  @Get('lint/status')
  lintStatus() {
    return this.service.list(parseCertificateListQuery({ page: '1', limit: '100' })).then((data) => ok({ data }));
  }

  @Get()
  list(@Query() query: CertificateListQueryInput) {
    return this.service.list(parseCertificateListQuery(query)).then(ok);
  }

  @Get(':id/lint')
  lint(@Param('id') id: string) {
    return this.service.getById(id).then(ok);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.getById(id).then(ok);
  }
}
