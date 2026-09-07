import { Module } from '@nestjs/common';
import { CsrsController } from '../facades.controller';
import { CsrsService } from './csrs.service';

@Module({ controllers: [CsrsController], providers: [CsrsService] })
export class CsrsModule {}
