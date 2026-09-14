import { Module } from '@nestjs/common';
import { UcmProxyClient } from '../common/v2-auth.client';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateWriteInfrastructure } from './write-infrastructure';

@Module({
  controllers: [CertificatesController],
  providers: [
    CertificateWriteInfrastructure,
    CertificatesService,
    {
      provide: UcmProxyClient,
      useFactory: () => new UcmProxyClient(
        process.env.UCM_AUTH_BASE_URL ?? 'https://ucm:8443',
        process.env.UCM_INTERNAL_AUTH_SECRET ?? '',
        fetch,
        process.env.EJBCA_GATEWAY_ENV !== 'development',
      ),
    },
  ],
})
export class CertificatesModule {}
