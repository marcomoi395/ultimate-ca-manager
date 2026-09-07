import { Module } from '@nestjs/common';
import { SupportingController } from '../facades.controller';

@Module({ controllers: [SupportingController] })
export class SupportingModule {}
