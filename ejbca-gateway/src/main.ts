import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EjbcaErrorFilter } from './common/ejbca-error.filter';
import { EnvelopeInterceptor } from './common/envelope.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new EjbcaErrorFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  const port = Number(process.env.EJBCA_GATEWAY_PORT ?? 8081);
  const host = process.env.EJBCA_GATEWAY_HOST ?? '0.0.0.0';
  app.setGlobalPrefix('api/v3');
  await app.listen(port, host);
}

void bootstrap();
