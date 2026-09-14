import { Controller, Get } from '@nestjs/common';
import { PublicRoute } from '../common/v3-auth.guard';
import { contractResponse } from './contracts';

@Controller('meta/contract')
@PublicRoute()
export class ContractMetaController {
  @Get()
  contract() {
    return contractResponse();
  }
}
