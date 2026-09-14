import { Global, Module } from '@nestjs/common';
import { loadGatewayConfig } from '../../common/gateway-config';
import { EjbcaHttpClient } from './http-client';
import { EjbcaResourceAdapter } from './resource-adapter';

@Global()
@Module({
  providers: [
    {
      provide: EjbcaHttpClient,
      useFactory: () => {
        try {
          const config = loadGatewayConfig(process.env);
          return new EjbcaHttpClient({
            baseUrl: config.ejbcaApiUrl,
            caCertFile: config.ejbcaCaCertFile,
            clientCertFile: config.ejbcaClientCertFile,
            clientKeyFile: config.ejbcaClientKeyFile,
            timeoutMs: config.timeoutMs,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'EJBCA mTLS configuration is invalid';
          return {
            request: async () => {
              throw new Error(message);
            },
          } as unknown as EjbcaHttpClient;
        }
      },
    },
    {
      provide: EjbcaResourceAdapter,
      useFactory: (client: EjbcaHttpClient) => new EjbcaResourceAdapter(client),
      inject: [EjbcaHttpClient],
    },
  ],
  exports: [EjbcaHttpClient, EjbcaResourceAdapter],
})
export class EjbcaModule {}
