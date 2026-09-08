import { Body, Controller, Delete, Get, Headers, Param, Post, Query, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { IncomingHttpHeaders } from 'node:http';
import { CsrsService, type CsrUploadFile } from './csrs.service';
import { parseCsrListQuery, type CsrListQueryInput } from './dtos/csr-list.query';

type RequestHeaders = IncomingHttpHeaders;

@Controller('csrs')
export class CsrsController {
  constructor(private readonly service: CsrsService) {}

  @Get()
  list(@Query() query: CsrListQueryInput, @Headers() headers: RequestHeaders) {
    return this.service.list(parseCsrListQuery(query), headers);
  }

  @Get('history')
  history(@Query() query: CsrListQueryInput, @Headers() headers: RequestHeaders) {
    return this.service.history(parseCsrListQuery(query), headers);
  }

  @Get(':id/export')
  async export(@Param('id') id: string, @Headers() headers: RequestHeaders) {
    const result = await this.service.export(id, headers);
    return new StreamableFile(Buffer.from(result.body as ArrayBuffer), { type: result.headers.get('content-type') ?? 'application/x-pem-file' });
  }

  @Get(':id')
  detail(@Param('id') id: string, @Headers() headers: RequestHeaders) {
    return this.service.getById(id, headers);
  }

  @Post()
  create(@Body() body: unknown, @Headers() headers: RequestHeaders) {
    return this.service.create(body, headers);
  }

  @Post('upload')
  upload(@Body() body: unknown, @Headers() headers: RequestHeaders) {
    return this.service.upload(body, headers);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file: CsrUploadFile | undefined, @Body() body: Record<string, string>, @Headers() headers: RequestHeaders) {
    return this.service.importCsr(file, body, headers);
  }

  @Post('bulk/sign')
  bulkSign(@Body() body: unknown, @Headers() headers: RequestHeaders) {
    return this.service.bulkSign(body, headers);
  }

  @Post('bulk/delete')
  bulkDelete(@Body() body: unknown, @Headers() headers: RequestHeaders) {
    return this.service.bulkDelete(body, headers);
  }

  @Post(':id/sign')
  sign(@Param('id') id: string, @Body() body: unknown, @Headers() headers: RequestHeaders) {
    return this.service.sign(id, body, headers);
  }

  @Post(':id/key')
  uploadKey(@Param('id') id: string, @Body() body: unknown, @Headers() headers: RequestHeaders) {
    return this.service.uploadKey(id, body, headers);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers() headers: RequestHeaders) {
    return this.service.delete(id, headers);
  }
}
