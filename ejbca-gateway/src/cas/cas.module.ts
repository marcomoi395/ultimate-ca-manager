import { Module } from '@nestjs/common';
import { CaTemplatesController, CasController } from '../facades.controller';
import { CasService } from './cas.service';

@Module({ controllers: [CasController, CaTemplatesController], providers: [CasService] })
export class CasModule {}
