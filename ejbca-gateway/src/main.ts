import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.EJBCA_GATEWAY_PORT ?? 8081);
  const host = process.env.EJBCA_GATEWAY_HOST ?? '0.0.0.0';

  app.setGlobalPrefix('api/v3');
  await app.listen(port, host);
}

void bootstrap();
