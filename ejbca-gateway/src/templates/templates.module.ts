import { Module } from '@nestjs/common';
import { TemplatesController } from '../facades.controller';

@Module({ controllers: [TemplatesController] })
export class TemplatesModule {}
