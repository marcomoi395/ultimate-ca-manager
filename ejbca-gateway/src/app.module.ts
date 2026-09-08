import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { V3AuthGuard } from './common/v3-auth.guard';
import { V2AuthClient, UcmProxyClient } from './common/v2-auth.client';
import { PermissionGuard } from './common/permission.guard';
import { EjbcaModule } from './integrations/ejbca/ejbca.module';
import { FoundationModule } from './foundation/foundation.module';
import { CertificatesModule } from './certificates/certificates.module';
import { CasModule } from './cas/cas.module';
import { CsrsModule } from './csrs/csrs.module';
import { TemplatesModule } from './templates/templates.module';
import { SupportingModule } from './supporting/supporting.module';

@Module({
  imports: [EjbcaModule, FoundationModule, CertificatesModule, CasModule, CsrsModule, TemplatesModule, SupportingModule],
  providers: [
    { provide: V2AuthClient, useFactory: () => new V2AuthClient(process.env.UCM_AUTH_BASE_URL ?? 'https://ucm:8443', process.env.UCM_INTERNAL_AUTH_SECRET ?? '', fetch, process.env.EJBCA_GATEWAY_ENV !== 'development') },
    { provide: UcmProxyClient, useFactory: () => new UcmProxyClient(process.env.UCM_AUTH_BASE_URL ?? 'https://ucm:8443', process.env.UCM_INTERNAL_AUTH_SECRET ?? '', fetch, process.env.EJBCA_GATEWAY_ENV !== 'development') },
    { provide: APP_GUARD, useFactory: (reflector: Reflector, authClient: V2AuthClient) => new V3AuthGuard(reflector, authClient), inject: [Reflector, V2AuthClient] },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [UcmProxyClient],
})
export class AppModule {}
