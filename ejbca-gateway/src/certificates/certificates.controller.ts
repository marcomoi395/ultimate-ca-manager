import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../common/permission.guard';
import { parseCertificateListQuery, type CertificateListQueryInput } from './dtos/certificate-list.query';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Get('stats')
  @RequirePermission('read:certificates')
  stats() { return this.service.stats(); }

  @Get('compliance')
  compliance() { return this.service.removed(); }

  @Get('lint/status')
  lintStatus() { return this.service.removed(); }
  @Get()
  @RequirePermission('read:certificates')
  list(@Query() query: CertificateListQueryInput) {
    return this.service.list(parseCertificateListQuery(query));
  }

  @Get(':id/lint')
  lint(@Param('id') _id: string, @Query('profile') _profile?: string) {
    return this.service.removed();
  }
  @Get(':id')
  @RequirePermission('read:certificates')
  detail(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(@Body() _body: unknown) { return this.service.mutate(); }

  @Patch(':id')
  rename(@Param('id') _id: string, @Body() _body: unknown) { return this.service.removed(); }

  @Post('import')
  importCertificate(@Body() _body: unknown) { return this.service.mutate(); }

  @Post('export')
  exportAll(@Body() _body: unknown) { return this.service.exportFile(); }

  @Post('bulk/:operation')
  bulk(@Param('operation') _operation: string, @Body() _body: unknown) { return this.service.mutate(); }

  @Delete(':id')
  remove(@Param('id') _id: string) { return this.service.removed(); }

  @Post(':id/revoke')
  revoke(@Param('id') _id: string, @Body() _body: unknown) { return this.service.mutate(); }

  @Post(':id/unhold')
  unhold(@Param('id') _id: string) { return this.service.mutate(); }

  @Post(':id/renew')
  renew(@Param('id') _id: string) { return this.service.mutate(); }

  @Post(':id/export')
  export(@Param('id') _id: string, @Body() _body: unknown) { return this.service.exportFile(); }

  @Post(':id/key')
  uploadKey(@Param('id') _id: string, @Body() _body: unknown) { return this.service.removed(); }

  @Post(':id/submit-ct')
  submitToCt(@Param('id') _id: string) { return this.service.removed(); }
}
