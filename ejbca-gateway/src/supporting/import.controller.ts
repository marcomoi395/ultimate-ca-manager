import { Body, Controller, Post } from '@nestjs/common';
import type { V3SuccessEnvelope } from '../common/contracts';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

function ok<T>(data: T): V3SuccessEnvelope<T> {
  return { data, message: 'ok', meta: {} };
}

@Controller('import')
export class ImportController {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  @Post('analyze')
  analyze(@Body() body: unknown) {
    return this.adapter.request('/v1/configdump', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }).then(ok);
  }

  @Post('execute')
  execute(@Body() body: unknown) {
    return this.adapter.request('/v1/configdump', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }).then(ok);
  }
}
