import { Controller, Get, Post } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';

@Controller('system')
export class SystemController {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  @Get('chain-repair')
  chainRepair() { return this.adapter.request('/v1/system/chain-repair'); }

  @Post('chain-repair/run')
  runChainRepair() { return this.adapter.request('/v1/system/chain-repair/run', { method: 'POST' }); }

  @Get('hsm-status')
  hsmStatus() { return this.adapter.request('/v1/cryptotoken/status'); }
}
