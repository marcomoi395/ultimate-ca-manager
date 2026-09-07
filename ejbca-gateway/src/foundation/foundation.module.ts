import { Module } from '@nestjs/common';
import { ContractMetaController } from './contract-meta.controller';
import { HealthController } from './health.controller';
import { SystemController } from './system.controller';

@Module({
  controllers: [HealthController, ContractMetaController, SystemController],
})
export class FoundationModule {}
