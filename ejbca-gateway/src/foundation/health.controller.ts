import { Controller, Get } from '@nestjs/common';
import { PublicRoute } from '../common/v3-auth.guard';
import { healthResponse } from './contracts';
import { EjbcaHealthProbe } from './ejbca-health.probe';

@Controller('health')
@PublicRoute()
export class HealthController {
  constructor(private readonly ejbcaHealthProbe: EjbcaHealthProbe) {}

  @Get()
  async health() {
    return healthResponse('healthy', await this.ejbcaHealthProbe.check());
  }
}
