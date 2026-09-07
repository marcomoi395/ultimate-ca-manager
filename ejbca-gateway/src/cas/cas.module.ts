import { Module } from '@nestjs/common';
import { CasController } from '../facades.controller';

@Module({ controllers: [CasController] })
export class CasModule {}
