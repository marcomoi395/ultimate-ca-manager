import { Controller, Get, Module } from '@nestjs/common';
import { contractResponse, healthResponse } from './foundation/contracts';
import { CertificatesModule } from './certificates/certificates.module';
import { CasModule } from './cas/cas.module';
import { CsrsModule } from './csrs/csrs.module';
import { TemplatesModule } from './templates/templates.module';
import { SupportingModule } from './supporting/supporting.module';

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
  imports: [CertificatesModule, CasModule, CsrsModule, TemplatesModule, SupportingModule],
  controllers: [HealthController, ContractController],
})
export class AppModule {}
