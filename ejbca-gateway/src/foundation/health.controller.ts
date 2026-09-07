import { Controller, Get } from '@nestjs/common';
import { PublicRoute } from '../common/v3-auth.guard';
import { healthResponse } from './contracts';

@Controller('health')
@PublicRoute()
export class HealthController {
  @Get()
  health() {
    return healthResponse('healthy', 'unavailable');
  }
}
