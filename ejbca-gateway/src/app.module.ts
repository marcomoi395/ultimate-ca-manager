import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { PublicRoute, V3AuthGuard } from './common/v3-auth.guard';
import { contractResponse, healthResponse } from './foundation/contracts';
import { CertificatesModule } from './certificates/certificates.module';
import { CasModule } from './cas/cas.module';
import { CsrsModule } from './csrs/csrs.module';
import { TemplatesModule } from './templates/templates.module';
import { SupportingModule } from './supporting/supporting.module';

@PublicRoute()
class HealthController {
  @Get()
  health() {
    return healthResponse('healthy', 'unavailable');
  }
}

@PublicRoute()
class ContractController {
  @Get()
  contract() {
    return contractResponse();
  }
}

@Module({
  imports: [CertificatesModule, CasModule, CsrsModule, TemplatesModule, SupportingModule],
  controllers: [HealthController, ContractController],
  providers: [
    { provide: APP_GUARD, useFactory: (reflector: Reflector) => new V3AuthGuard(reflector, process.env.GATEWAY_ADMIN_TOKEN ?? 'change-me'), inject: [Reflector] },
  ],
})
export class AppModule {}
