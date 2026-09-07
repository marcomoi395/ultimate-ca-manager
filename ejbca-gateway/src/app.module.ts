import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { V3AuthGuard } from './common/v3-auth.guard';
import { FoundationModule } from './foundation/foundation.module';
import { CertificatesModule } from './certificates/certificates.module';
import { CasModule } from './cas/cas.module';
import { CsrsModule } from './csrs/csrs.module';
import { TemplatesModule } from './templates/templates.module';
import { SupportingModule } from './supporting/supporting.module';

@Module({
  imports: [FoundationModule, CertificatesModule, CasModule, CsrsModule, TemplatesModule, SupportingModule],
  providers: [
    { provide: APP_GUARD, useFactory: (reflector: Reflector) => new V3AuthGuard(reflector, process.env.GATEWAY_ADMIN_TOKEN ?? 'change-me'), inject: [Reflector] },
  ],
})
export class AppModule {}
