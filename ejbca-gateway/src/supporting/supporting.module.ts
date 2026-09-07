import { Module } from '@nestjs/common';
import { EkuController, HsmController, ImportController, MscaController } from '../facades.controller';

@Module({ controllers: [ImportController, EkuController, MscaController, HsmController] })
export class SupportingModule {}
