import { Controller, Get, Module } from '@nestjs/common';
import { contractResponse, healthResponse } from './foundation/contracts';
import { CertificatesController, CasController, CsrsController, TemplatesController, SupportingController } from './facades.controller';

@Controller('health')
class HealthController {
  @Get()
  health() {
    return healthResponse('healthy', 'unavailable');
  }
}

@Controller('meta/contract')
class ContractController {
  @Get()
  contract() {
    return contractResponse();
  }
}

@Module({
  controllers: [HealthController, ContractController, CertificatesController, CasController, CsrsController, TemplatesController, SupportingController],
})
export class AppModule {}
