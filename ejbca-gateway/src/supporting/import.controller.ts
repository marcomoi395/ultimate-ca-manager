import { Body, Controller, Post } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

@Controller('import')
export class ImportController {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  @Post('analyze')
  analyze(@Body() body: unknown) {
    return this.adapter.request('/v1/configdump', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  }

  @Post('execute')
  execute(@Body() body: unknown) {
    return this.adapter.request('/v1/configdump', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  }
}
