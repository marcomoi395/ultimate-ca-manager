import { Module } from '@nestjs/common';
import { ContractMetaController } from './contract-meta.controller';
import { HealthController } from './health.controller';
import { SystemController } from './system.controller';
import { EjbcaHealthProbe } from './ejbca-health.probe';

@Module({
  controllers: [HealthController, ContractMetaController, SystemController],
  providers: [EjbcaHealthProbe],
})
export class FoundationModule {}
