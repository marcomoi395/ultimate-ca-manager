import { Module } from '@nestjs/common';
import { CsrsController } from '../facades.controller';

@Module({ controllers: [CsrsController] })
export class CsrsModule {}
