import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { RequirePermission } from '../common/permission.guard';
import { parseCertificateListQuery, type CertificateListQueryInput } from './dtos/certificate-list.query';
import { parseCertificateEnrollmentRequest } from './dtos/certificate-enrollment.request';
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
  @RequirePermission('write:certificates')
  create(@Body() body: Record<string, unknown>, @Headers('idempotency-key') key?: string) {
    return this.service.issue(parseCertificateEnrollmentRequest(body), key);
  }

  @Patch(':id')
  rename(@Param('id') _id: string, @Body() _body: unknown) { return this.service.removed(); }

  @Post('import')
  importCertificate(@Body() _body: unknown) { return this.service.mutate(); }

  @Post('export')
  exportAll(@Body() _body: unknown) { return this.service.mutate(); }

  @Post('bulk/:operation')
  bulk(@Param('operation') _operation: string, @Body() _body: unknown) { return this.service.mutate(); }

  @Delete(':id')
  remove(@Param('id') _id: string) { return this.service.removed(); }

  @Post(':id/revoke')
  @RequirePermission('delete:certificates')
  revoke(@Param('id') id: string, @Body() body: { reason?: string; issuer?: string }, @Headers('idempotency-key') key?: string) { return this.service.revoke(id, body, key); }

  @Post(':id/unhold')
  @RequirePermission('write:certificates')
  unhold(@Param('id') id: string, @Query('issuer') issuer?: string, @Headers('idempotency-key') key?: string) { return this.service.unhold(id, issuer, key); }

  @Post(':id/renew')
  renew(@Param('id') _id: string) { return this.service.mutate(); }

  @Post(':id/export')
  @RequirePermission('read:certificates')
  async export(@Param('id') id: string, @Body() body: unknown) {
    const result = await this.service.exportFile(id, body);
    return new StreamableFile(result.data, {
      type: result.type,
      disposition: `attachment; filename="${result.filename}"`,
      length: result.data.length,
    });
  }

  @Post(':id/key')
  uploadKey(@Param('id') _id: string, @Body() _body: unknown) { return this.service.removed(); }

  @Post(':id/submit-ct')
  submitToCt(@Param('id') _id: string) { return this.service.removed(); }
}
