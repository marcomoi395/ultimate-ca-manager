import { Module } from '@nestjs/common';
import { CaTemplatesController, CasController } from '../facades.controller';

@Module({ controllers: [CasController, CaTemplatesController] })
export class CasModule {}
