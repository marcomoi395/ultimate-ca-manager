import { Controller, Get, Param } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('microsoft-cas')
export class MscaController {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  @Get('enabled')
  enabled() { return this.adapter.request('/v1/ca/status').then(ok); }

  @Get('requests/pending')
  pending() { return this.adapter.request('/v1/approval').then(ok); }

  @Get(':id/templates')
  templates(@Param('id') id: string) { return this.adapter.request(`/v1/ca/${encodeURIComponent(id)}/certificateprofile`).then(ok); }

  @Get(':id/requests/:requestId')
  request(@Param('requestId') requestId: string) { return this.adapter.request(`/v1/approval/${encodeURIComponent(requestId)}`).then(ok); }
}
