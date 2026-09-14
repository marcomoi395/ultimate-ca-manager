import { Module } from '@nestjs/common';
import { CsrsController } from './csrs.controller';
import { CsrsService } from './csrs.service';
import { UcmProxyClient } from '../common/v2-auth.client';

@Module({
  controllers: [CsrsController],
  providers: [
    CsrsService,
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
export class CsrsModule {}
