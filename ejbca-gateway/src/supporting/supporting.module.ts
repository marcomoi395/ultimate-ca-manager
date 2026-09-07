import { Module } from '@nestjs/common';
import { EkuController } from './eku.controller';
import { HsmController } from './hsm.controller';
import { ImportController } from './import.controller';
import { MscaController } from './msca.controller';
import { CatalogService } from './catalog.service';
import { HsmService } from './hsm.service';
import { ImportService } from './import.service';

@Module({
  controllers: [ImportController, EkuController, MscaController, HsmController],
  providers: [ImportService, HsmService, CatalogService],
})
export class SupportingModule {}
